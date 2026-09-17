#import "SuperToast.h"

#import <React/RCTInvalidating.h>
#import <ReactCommon/RCTTurboModule.h>

#import "SuperToastConfig.h"
#import "SuperToastHost.h"

using namespace JS::NativeSuperToast;

static NSNumber *SuperToastNumber(std::optional<double> value)
{
  return value ? @(*value) : nil;
}

static NSString *SuperToastNonBlank(NSString *value)
{
  NSString *trimmed = [value stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet];
  return trimmed.length > 0 ? value : nil;
}

static SuperToastBoxStyle *SuperToastBox(const NativeBoxStyle &value)
{
  SuperToastBoxStyle *style = [SuperToastBoxStyle new];
  style.backgroundColor = SuperToastColorFromString(value.backgroundColor()) ?: UIColor.clearColor;
  style.borderColor = SuperToastColorFromString(value.borderColor()) ?: UIColor.clearColor;
  style.borderWidth = value.borderWidth().value_or(0);
  style.borderRadius = value.borderRadius().value_or(0);
  style.paddingHorizontal = value.paddingHorizontal().value_or(0);
  style.paddingVertical = value.paddingVertical().value_or(0);
  return style;
}

static SuperToastTextStyle *SuperToastText(const NativeTextStyle &value)
{
  return [SuperToastTextStyle styleWithColor:value.color()
                                    fontSize:SuperToastNumber(value.fontSize())
                                  fontFamily:value.fontFamily()
                                  fontWeight:value.fontWeight()
                                  lineHeight:SuperToastNumber(value.lineHeight())];
}

static SuperToastButtonConfig *SuperToastButton(const std::optional<NativeToastButton> &value)
{
  if (!value || value->label().length == 0) {
    return nil;
  }
  SuperToastButtonConfig *button = [SuperToastButtonConfig new];
  button.label = value->label();
  button.style = SuperToastBox(value->style());
  button.textStyle = SuperToastText(value->textStyle());
  return button;
}

static SuperToastIconConfig *SuperToastIcon(const std::optional<NativeToastIcon> &value)
{
  if (!value) {
    return nil;
  }
  SuperToastIconConfig *icon = [SuperToastIconConfig new];
  icon.type = value->type() ?: @"text";
  icon.value = value->value();
  icon.glyph = value->glyph();
  icon.fontFamily = value->fontFamily();
  icon.uri = value->uri();
  icon.width = SuperToastNumber(value->width());
  icon.height = SuperToastNumber(value->height());
  icon.size = SuperToastNumber(value->size());
  icon.scale = SuperToastNumber(value->scale());
  icon.color = SuperToastColorFromString(value->color());
  icon.tintColor = SuperToastColorFromString(value->tintColor());
  icon.cornerRadius = value->cornerRadius().value_or(0);
  return icon;
}

static SuperToastConfig *SuperToastConfigFrom(NativeToastOptions &options)
{
  SuperToastConfig *config = [SuperToastConfig new];
  config.toastId = options.id_();
  config.variant = options.variant() ?: @"default";
  config.title = options.title() ?: @"";
  config.toastDescription = SuperToastNonBlank(options.description());
  config.icon = SuperToastIcon(options.icon());
  config.iconColor = SuperToastColorFromString(options.iconColor()) ?: UIColor.darkGrayColor;
  config.duration = MAX(0, options.duration()) / 1000;
  config.position = options.position() ?: @"top-center";
  config.dismissible = options.dismissible();
  config.closeButton = options.closeButton();
  config.closeButtonColor = SuperToastColorFromString(options.closeButtonColor()) ?: UIColor.darkGrayColor;
  config.swipeDirection = options.swipeDirection() ?: @"up";
  config.haptic = options.haptic();
  config.enableStacking = options.enableStacking();
  config.expandOnPress = options.expandOnPress();
  config.visibleToasts = MAX(1, (NSInteger)round(options.visibleToasts()));
  config.gap = options.gap();
  config.offset = SuperToastNumber(options.offset());
  config.style = SuperToastBox(options.style());
  config.titleStyle = SuperToastText(options.titleStyle());
  config.descriptionStyle = SuperToastText(options.descriptionStyle());
  config.action = SuperToastButton(options.action());
  config.cancel = SuperToastButton(options.cancel());
  return config;
}

@interface SuperToast () <RCTInvalidating>
@end

@implementation SuperToast {
  SuperToastHost *_host;
}

RCT_EXPORT_MODULE(SuperToast)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

- (SuperToastHost *)host
{
  if (!_host) {
    __weak SuperToast *weakSelf = self;
    _host = [[SuperToastHost alloc] initWithEventHandler:^(NSString *toastId, NSString *type) {
      [weakSelf emitOnToastEvent:@{@"id" : toastId, @"type" : type}];
    }];
  }
  return _host;
}

- (void)show:(NativeToastOptions &)options
{
  if (options.id_().length == 0) {
    return;
  }
  [self.host show:SuperToastConfigFrom(options)];
}

- (void)dismiss:(NSString *)toastId
{
  [self.host dismiss:toastId];
}

- (void)wiggle:(NSString *)toastId
{
  [self.host wiggle:toastId];
}

- (void)invalidate
{
  SuperToastHost *host = _host;
  _host = nil;
  dispatch_async(dispatch_get_main_queue(), ^{
    [host invalidate];
  });
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeSuperToastSpecJSI>(params);
}

@end
