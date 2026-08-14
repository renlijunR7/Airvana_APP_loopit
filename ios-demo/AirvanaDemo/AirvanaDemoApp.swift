import SwiftUI

@main
struct AirvanaDemoApp: App {
    var body: some Scene {
        WindowGroup {
            AirvanaWebContainer()
                .background(Color(uiColor: .systemGroupedBackground))
                .ignoresSafeArea()
        }
    }
}
