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

- (NSString *)show:(NSDictionary *)options
{
  // Toast state and rendering are handled by NativeSuperToast.ios.ts,
  // iosToastStore.ts, and SuperToastHost.ios.tsx.
  NSString *toastId = [options[@"id"] isKindOfClass:NSString.class]
    ? options[@"id"]
    : NSUUID.UUID.UUIDString;
  return toastId;
}

- (void)update:(NSString *)toastId options:(NSDictionary *)options
{
  (void)toastId;
  (void)options;
}

- (void)dismiss:(NSString *)toastId
{
  (void)toastId;
}

- (void)dismissAll
{
}

- (void)configure:(NSDictionary *)defaults
{
  (void)defaults;
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
