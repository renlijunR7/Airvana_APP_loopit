package ai.airvana.airvana_mobile

import android.os.Build
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Android 12+ 的系统启动图在 Flutter 画出第一帧之后还要跑一段退出动画，
        // 模拟器上实测 0.6～1s 以上。App 自己的启动页（/launch）从第一帧光栅化
        // 起只停 1040ms，这段动画会把它盖掉大半。这里把退出动画去掉，
        // 系统启动图在第一帧到位时立刻让位，启动页能完整露出来。
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            splashScreen.setOnExitAnimationListener { view -> view.remove() }
        }
    }
}
