package ai.airvana.demo;

import android.content.res.AssetManager;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.BufferedReader;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

final class LocalAssetServer {
    private final AssetManager assets;
    private final int port;
    private final ExecutorService workers = Executors.newCachedThreadPool();
    private volatile boolean running;
    private ServerSocket serverSocket;
    private Thread acceptThread;

    LocalAssetServer(AssetManager assets, int port) {
        this.assets = assets;
        this.port = port;
    }

    void start() throws IOException {
        serverSocket = new ServerSocket(port, 16, InetAddress.getByName("127.0.0.1"));
        running = true;
        acceptThread = new Thread(() -> {
            while (running) {
                try {
                    Socket socket = serverSocket.accept();
                    workers.execute(() -> handle(socket));
                } catch (IOException error) {
                    if (running) {
                        error.printStackTrace();
                    }
                }
            }
        }, "airvana-local-server");
        acceptThread.setDaemon(true);
        acceptThread.start();
    }

    void stop() {
        running = false;
        try {
            if (serverSocket != null) {
                serverSocket.close();
            }
        } catch (IOException ignored) {
        }
        workers.shutdownNow();
    }

    private void handle(Socket socket) {
        try (Socket client = socket;
             BufferedReader reader = new BufferedReader(new InputStreamReader(client.getInputStream(), StandardCharsets.UTF_8));
             OutputStream rawOutput = new BufferedOutputStream(client.getOutputStream())) {
            String requestLine = reader.readLine();
            if (requestLine == null || requestLine.trim().isEmpty()) {
                return;
            }
            String[] parts = requestLine.split(" ");
            if (parts.length < 2) {
                writeText(rawOutput, 400, "Bad Request", "text/plain; charset=utf-8", "Bad Request");
                return;
            }
            String method = parts[0].toUpperCase(Locale.US);
            String rawPath = parts[1];
            int queryIndex = rawPath.indexOf('?');
            if (queryIndex >= 0) {
                rawPath = rawPath.substring(0, queryIndex);
            }
            String decoded = URLDecoder.decode(rawPath, "UTF-8");
            if (decoded.contains("..")) {
                writeText(rawOutput, 403, "Forbidden", "text/plain; charset=utf-8", "Forbidden");
                return;
            }
            if (decoded.startsWith("/api/")) {
                writeText(rawOutput, 503, "Service Unavailable", "application/json; charset=utf-8",
                        "{\"ok\":false,\"code\":\"APK_DEMO_FRONTEND_ONLY\",\"message\":\"当前 APK 仅包含前端演示，真实账号与服务能力待后端接入。\"}");
                return;
            }
            String assetPath = decoded.equals("/") || decoded.isEmpty()
                    ? "www/index.html"
                    : "www/" + decoded.replaceFirst("^/", "");
            if (assetPath.endsWith("/")) {
                assetPath += "index.html";
            }
            try (InputStream assetInput = new BufferedInputStream(assets.open(assetPath, AssetManager.ACCESS_STREAMING))) {
                writeHeaders(rawOutput, 200, "OK", mimeType(assetPath));
                if (!"HEAD".equals(method)) {
                    byte[] buffer = new byte[32 * 1024];
                    int count;
                    while ((count = assetInput.read(buffer)) != -1) {
                        rawOutput.write(buffer, 0, count);
                    }
                }
            } catch (FileNotFoundException missing) {
                writeText(rawOutput, 404, "Not Found", "text/plain; charset=utf-8", "Not Found");
            }
            rawOutput.flush();
        } catch (IOException ignored) {
        }
    }

    private static void writeText(OutputStream output, int status, String reason, String type, String text) throws IOException {
        byte[] body = text.getBytes(StandardCharsets.UTF_8);
        String headers = "HTTP/1.1 " + status + " " + reason + "\r\n"
                + "Content-Type: " + type + "\r\n"
                + "Content-Length: " + body.length + "\r\n"
                + "Cache-Control: no-store\r\n"
                + "Connection: close\r\n\r\n";
        output.write(headers.getBytes(StandardCharsets.US_ASCII));
        output.write(body);
        output.flush();
    }

    private static void writeHeaders(OutputStream output, int status, String reason, String type) throws IOException {
        String headers = "HTTP/1.1 " + status + " " + reason + "\r\n"
                + "Content-Type: " + type + "\r\n"
                + "Cache-Control: no-cache\r\n"
                + "Connection: close\r\n\r\n";
        output.write(headers.getBytes(StandardCharsets.US_ASCII));
    }

    private static String mimeType(String path) {
        String lower = path.toLowerCase(Locale.US);
        if (lower.endsWith(".html")) return "text/html; charset=utf-8";
        if (lower.endsWith(".css")) return "text/css; charset=utf-8";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript; charset=utf-8";
        if (lower.endsWith(".json")) return "application/json; charset=utf-8";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".mp4")) return "video/mp4";
        if (lower.endsWith(".webm")) return "video/webm";
        if (lower.endsWith(".woff2")) return "font/woff2";
        if (lower.endsWith(".woff")) return "font/woff";
        return "application/octet-stream";
    }
}
