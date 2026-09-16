#import "SuperToast.h"

#import <React/RCTBridgeModule.h>
#import <ReactCommon/RCTTurboModule.h>

// Implemented in SuperToastHaptics.swift. Declaring the Objective-C surface here
// avoids coupling this adapter to CocoaPods' generated Swift header name.
@interface SuperToastHaptics : NSObject
+ (void)trigger;
@end

@implementation SuperToast

RCT_EXPORT_MODULE(SuperToast)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

// Toast state and rendering are handled in JS on iOS by backend.ios.ts,
// iosToastStore.ts, and ToastHost.ios.tsx. Only haptics need native code.
- (void)show:(NSDictionary *)options
{
  (void)options;
}

- (void)dismiss:(NSString *)toastId
{
  (void)toastId;
}

- (void)wiggle:(NSString *)toastId
{
  (void)toastId;
}

- (void)triggerHaptic
{
  [SuperToastHaptics trigger];
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
  (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeSuperToastSpecJSI>(params);
}
#endif

@end
