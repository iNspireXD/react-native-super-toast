package com.supertoast

import com.facebook.react.bridge.ReactApplicationContext

class SuperToastModule(reactContext: ReactApplicationContext) :
  NativeSuperToastSpec(reactContext) {

  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }

  companion object {
    const val NAME = NativeSuperToastSpec.NAME
  }
}
