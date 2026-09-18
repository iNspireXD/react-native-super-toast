#import "SuperToastConfig.h"

#import <React/RCTFont.h>

UIColor *SuperToastColorFromString(NSString *value)
{
  if (![value isKindOfClass:[NSString class]] || value.length != 9 || ![value hasPrefix:@"#"]) {
    return nil;
  }

  unsigned int argb = 0;
  NSScanner *scanner = [NSScanner scannerWithString:[value substringFromIndex:1]];
  if (![scanner scanHexInt:&argb]) {
    return nil;
  }

  return [UIColor colorWithRed:((argb >> 16) & 0xFF) / 255.0
                         green:((argb >> 8) & 0xFF) / 255.0
                          blue:(argb & 0xFF) / 255.0
                         alpha:((argb >> 24) & 0xFF) / 255.0];
}

@implementation SuperToastBoxStyle

- (instancetype)init
{
  if (self = [super init]) {
    _backgroundColor = UIColor.clearColor;
    _borderColor = UIColor.clearColor;
  }
  return self;
}

@end

@implementation SuperToastTextStyle

+ (instancetype)styleWithColor:(NSString *)color
                      fontSize:(NSNumber *)fontSize
                    fontFamily:(NSString *)fontFamily
                    fontWeight:(NSString *)fontWeight
                    lineHeight:(NSNumber *)lineHeight
{
  // Matches React Native Text, which scales with Dynamic Type by default.
  CGFloat scale = [UIFontMetrics.defaultMetrics scaledValueForValue:17] / 17;

  SuperToastTextStyle *style = [SuperToastTextStyle new];
  style.color = SuperToastColorFromString(color) ?: UIColor.blackColor;
  style.font = [RCTFont updateFont:nil
                        withFamily:fontFamily.length > 0 ? fontFamily : nil
                              size:fontSize ?: @14
                            weight:fontWeight ?: @"400"
                             style:nil
                           variant:nil
                   scaleMultiplier:scale];
  style.lineHeight = lineHeight.doubleValue * scale;
  return style;
}

- (NSAttributedString *)attributedStringWithText:(NSString *)text
{
  NSMutableDictionary<NSAttributedStringKey, id> *attributes = [@{
    NSFontAttributeName : self.font,
    NSForegroundColorAttributeName : self.color,
  } mutableCopy];

  if (self.lineHeight > 0) {
    NSMutableParagraphStyle *paragraph = [NSMutableParagraphStyle new];
    paragraph.minimumLineHeight = self.lineHeight;
    paragraph.maximumLineHeight = self.lineHeight;
    attributes[NSParagraphStyleAttributeName] = paragraph;
    // Centers glyphs vertically in the line box, as React Native does.
    attributes[NSBaselineOffsetAttributeName] = @((self.lineHeight - self.font.lineHeight) / 2);
  }

  return [[NSAttributedString alloc] initWithString:text attributes:attributes];
}

@end

@implementation SuperToastButtonConfig
@end

@implementation SuperToastIconConfig
@end

@implementation SuperToastConfig

- (BOOL)swipesHorizontally
{
  return [self.swipeDirection isEqualToString:@"left"] || [self.swipeDirection isEqualToString:@"right"];
}

@end
