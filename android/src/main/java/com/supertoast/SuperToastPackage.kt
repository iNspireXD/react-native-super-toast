package com.supertoast

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class SuperToastPackage : TurboReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return if (name == SuperToastModule.NAME) SuperToastModule(reactContext) else null
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider {
        mapOf(
            SuperToastModule.NAME to ReactModuleInfo(
                SuperToastModule.NAME,
                SuperToastModule.NAME,
                false,
                false,
                false,
                false,
                true
            )
        )
    }
}
