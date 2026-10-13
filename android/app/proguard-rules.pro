# kotlinx.serialization keeps its generated serializers through the plugin's consumer rules.
# Keep the model classes by name so reflection-free lookups still resolve after R8.
-keep,includedescriptorclasses class dev.caraka.android.data.**$$serializer { *; }
-keepclassmembers class dev.caraka.android.data.** {
    *** Companion;
}
-keepclasseswithmembers class dev.caraka.android.data.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# Optional TLS providers that OkHttp probes for at run time.
-dontwarn org.bouncycastle.**
-dontwarn org.conscrypt.**
-dontwarn org.openjsse.**
