#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * Draws the built-in state and close icons: Lucide geometry on a 24-unit grid
 * with a 2-unit round stroke. Keep in sync with ToastGlyphView.kt on Android.
 */
@interface SuperToastGlyphView : UIView

+ (BOOL)hasGlyph:(NSString *)glyph;

- (instancetype)initWithGlyph:(NSString *)glyph color:(UIColor *)color;

@end

NS_ASSUME_NONNULL_END
