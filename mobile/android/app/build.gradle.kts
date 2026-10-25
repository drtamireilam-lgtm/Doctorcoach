plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
    namespace = "com.doctorcoach.mobile"
    compileSdk = 35
    defaultConfig { applicationId = "com.doctorcoach.mobile"; minSdk = 28; targetSdk = 35; versionCode = 1; versionName = "0.1" }
    buildFeatures { buildConfig = true }
    defaultConfig { buildConfigField("String", "APP_ORIGIN", "\"https://configure-before-build.invalid\"") }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
}
dependencies {
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.health.connect:connect-client:1.1.0")
}
