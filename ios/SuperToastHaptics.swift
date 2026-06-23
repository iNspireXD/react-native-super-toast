import UIKit

@objc(SuperToastHaptics)
final class SuperToastHaptics: NSObject {
  @objc
  static func trigger() {
    DispatchQueue.main.async {
      let generator = UIImpactFeedbackGenerator(style: .light)
      generator.prepare()
      generator.impactOccurred()
    }
  }
}
