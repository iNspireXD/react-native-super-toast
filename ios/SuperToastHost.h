#import <UIKit/UIKit.h>

#import "SuperToastConfig.h"

NS_ASSUME_NONNULL_BEGIN

typedef void (^SuperToastEventHandler)(NSString *toastId, NSString *type);

/**
 * Presents toasts in a dedicated pass-through UIWindow above the app's windows,
 * which keeps them above React Native modals and bottom sheets. Positioning
 * mirrors ToastDialogHost.kt on Android. Must be used on the main thread.
 */
@interface SuperToastHost : NSObject

- (instancetype)initWithEventHandler:(SuperToastEventHandler)eventHandler;

- (void)show:(SuperToastConfig *)config;
- (void)dismiss:(nullable NSString *)toastId;
- (void)wiggle:(NSString *)toastId;
/** Removes every toast without events. */
- (void)invalidate;

@end

NS_ASSUME_NONNULL_END
