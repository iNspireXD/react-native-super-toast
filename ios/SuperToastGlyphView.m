#import "SuperToastGlyphView.h"

/** Each path is a flattened list of x/y pairs. A single pair draws a dot. */
static NSDictionary<NSString *, NSArray<NSArray<NSNumber *> *> *> *SuperToastGlyphPaths(void)
{
  static NSDictionary *paths;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    paths = @{
      @"success" : @[ @[ @9, @12, @11, @14, @15, @10 ] ],
      @"error" : @[ @[ @15, @9, @9, @15 ], @[ @9, @9, @15, @15 ] ],
      @"warning" : @[
        @[
          @12, @2.6, @13.73, @4, @21.73, @18, @22.36, @20.25, @20, @21,
          @4, @21, @1.64, @20.25, @2.27, @18, @10.27, @4, @12, @2.6
        ],
        @[ @12, @9, @12, @13 ],
        @[ @12, @17 ],
      ],
      @"info" : @[ @[ @12, @16, @12, @12 ], @[ @12, @8 ] ],
      @"close" : @[ @[ @18, @6, @6, @18 ], @[ @6, @6, @18, @18 ] ],
    };
  });
  return paths;
}

@implementation SuperToastGlyphView {
  NSString *_glyph;
  CAShapeLayer *_shapeLayer;
}

+ (BOOL)hasGlyph:(NSString *)glyph
{
  return SuperToastGlyphPaths()[glyph] != nil;
}

- (instancetype)initWithGlyph:(NSString *)glyph color:(UIColor *)color
{
  if (self = [super initWithFrame:CGRectZero]) {
    _glyph = [glyph copy];
    _shapeLayer = [CAShapeLayer layer];
    _shapeLayer.fillColor = nil;
    _shapeLayer.strokeColor = color.CGColor;
    _shapeLayer.lineCap = kCALineCapRound;
    _shapeLayer.lineJoin = kCALineJoinRound;
    [self.layer addSublayer:_shapeLayer];
    self.userInteractionEnabled = NO;
  }
  return self;
}

- (void)layoutSubviews
{
  [super layoutSubviews];

  CGRect bounds = self.bounds;
  CGFloat scale = MIN(bounds.size.width, bounds.size.height) / 24;
  UIBezierPath *path = [UIBezierPath bezierPath];

  if (![_glyph isEqualToString:@"warning"] && ![_glyph isEqualToString:@"close"]) {
    [path appendPath:[UIBezierPath bezierPathWithArcCenter:CGPointMake(12, 12)
                                                    radius:10
                                                startAngle:0
                                                  endAngle:2 * M_PI
                                                 clockwise:YES]];
  }

  for (NSArray<NSNumber *> *points in SuperToastGlyphPaths()[_glyph]) {
    CGPoint start = CGPointMake(points[0].doubleValue, points[1].doubleValue);
    [path moveToPoint:start];
    if (points.count == 2) {
      // A zero-length segment with a round cap renders as a dot.
      [path addLineToPoint:CGPointMake(start.x + 0.01, start.y)];
      continue;
    }
    for (NSUInteger index = 2; index + 1 < points.count; index += 2) {
      [path addLineToPoint:CGPointMake(points[index].doubleValue, points[index + 1].doubleValue)];
    }
  }

  CGFloat offsetX = (bounds.size.width - 24 * scale) / 2;
  CGFloat offsetY = (bounds.size.height - 24 * scale) / 2;
  [path applyTransform:CGAffineTransformMake(scale, 0, 0, scale, offsetX, offsetY)];

  _shapeLayer.frame = bounds;
  _shapeLayer.lineWidth = 2 * scale;
  _shapeLayer.path = path.CGPath;
}

@end
