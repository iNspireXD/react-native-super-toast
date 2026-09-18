#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

/** Parses the `#AARRGGBB` strings produced by src/backend.ts. */
FOUNDATION_EXTERN UIColor *_Nullable SuperToastColorFromString(NSString *_Nullable value);

@interface SuperToastBoxStyle : NSObject
@property (nonatomic, strong) UIColor *backgroundColor;
@property (nonatomic, strong) UIColor *borderColor;
@property (nonatomic) CGFloat borderWidth;
@property (nonatomic) CGFloat borderRadius;
@property (nonatomic) CGFloat paddingHorizontal;
@property (nonatomic) CGFloat paddingVertical;
@end

@interface SuperToastTextStyle : NSObject
@property (nonatomic, strong) UIColor *color;
@property (nonatomic, strong) UIFont *font;
/** 0 keeps the font's natural line height. */
@property (nonatomic) CGFloat lineHeight;

+ (instancetype)styleWithColor:(nullable NSString *)color
                      fontSize:(nullable NSNumber *)fontSize
                    fontFamily:(nullable NSString *)fontFamily
                    fontWeight:(nullable NSString *)fontWeight
                    lineHeight:(nullable NSNumber *)lineHeight;

- (NSAttributedString *)attributedStringWithText:(NSString *)text;
@end

@interface SuperToastButtonConfig : NSObject
@property (nonatomic, copy) NSString *label;
@property (nonatomic, strong) SuperToastBoxStyle *style;
@property (nonatomic, strong) SuperToastTextStyle *textStyle;
@end

@interface SuperToastIconConfig : NSObject
@property (nonatomic, copy) NSString *type;
@property (nonatomic, copy, nullable) NSString *value;
@property (nonatomic, copy, nullable) NSString *glyph;
@property (nonatomic, copy, nullable) NSString *fontFamily;
@property (nonatomic, copy, nullable) NSString *uri;
@property (nonatomic, strong, nullable) NSNumber *width;
@property (nonatomic, strong, nullable) NSNumber *height;
@property (nonatomic, strong, nullable) NSNumber *size;
@property (nonatomic, strong, nullable) NSNumber *scale;
@property (nonatomic, strong, nullable) UIColor *color;
@property (nonatomic, strong, nullable) UIColor *tintColor;
@property (nonatomic) CGFloat cornerRadius;
@end

/** A toast whose visual values were fully resolved in JS (see resolve.ts). */
@interface SuperToastConfig : NSObject
@property (nonatomic, copy) NSString *toastId;
@property (nonatomic, copy) NSString *variant;
@property (nonatomic, copy) NSString *title;
@property (nonatomic, copy, nullable) NSString *toastDescription;
@property (nonatomic, strong, nullable) SuperToastIconConfig *icon;
@property (nonatomic, strong) UIColor *iconColor;
/** Seconds. 0 keeps the toast until it is dismissed. */
@property (nonatomic) NSTimeInterval duration;
@property (nonatomic, copy) NSString *position;
@property (nonatomic) BOOL dismissible;
@property (nonatomic) BOOL closeButton;
@property (nonatomic, strong) UIColor *closeButtonColor;
@property (nonatomic, copy) NSString *swipeDirection;
@property (nonatomic) BOOL haptic;
@property (nonatomic) BOOL enableStacking;
@property (nonatomic) BOOL expandOnPress;
@property (nonatomic) NSInteger visibleToasts;
@property (nonatomic) CGFloat gap;
@property (nonatomic, strong, nullable) NSNumber *offset;
@property (nonatomic, strong) SuperToastBoxStyle *style;
@property (nonatomic, strong) SuperToastTextStyle *titleStyle;
@property (nonatomic, strong) SuperToastTextStyle *descriptionStyle;
@property (nonatomic, strong, nullable) SuperToastButtonConfig *action;
@property (nonatomic, strong, nullable) SuperToastButtonConfig *cancel;

@property (nonatomic, readonly) BOOL swipesHorizontally;
@end

NS_ASSUME_NONNULL_END
