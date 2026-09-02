# ProGuard & R8 Keep Rules for BRICK DEAL (Expo SDK 54)
# Prevents R8 from stripping native reflection classes for React Native, Expo, Supabase & Tablets.

# React Native Core
-keep class com.facebook.react.** { *; }
-keep interface com.facebook.react.** { *; }
-dontwarn com.facebook.react.**

# Expo Modules & Plugins
-keep class expo.modules.** { *; }
-keep interface expo.modules.** { *; }
-dontwarn expo.modules.**

# Supabase & HTTP Client
-keep class io.supabase.** { *; }
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**

# React Native Async Storage
-keep class com.reactnativeasyncstorage.asyncstorage.** { *; }
-dontwarn com.reactnativeasyncstorage.asyncstorage.**

# React Native SVG & Vector Icons
-keep class com.horcrux.svg.** { *; }
-keep class com.oblador.vectoricons.** { *; }

# Keep native C++/JNI methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep Serializable classes
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}
