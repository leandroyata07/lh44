#!/bin/bash
set -e

TOOLS_DIR="$HOME/.android_build_tools"
export JAVA_HOME="$TOOLS_DIR/jdk"
export PATH="$JAVA_HOME/bin:$PATH"

AAPT2="$TOOLS_DIR/build-tools/android-14/aapt2"
D8="$TOOLS_DIR/build-tools/android-14/d8"
ZIPALIGN="$TOOLS_DIR/build-tools/android-14/zipalign"
APKSIGNER="$TOOLS_DIR/build-tools/android-14/apksigner"
ANDROID_JAR="$TOOLS_DIR/platform/android-35/android.jar"

PROJECT_DIR="/home/leandroyata/Área de trabalho/lh44/android-project"
OUTPUT_APK="/home/leandroyata/Área de trabalho/lh44/LH44.apk"

cd "$PROJECT_DIR"
rm -rf build gen obj
mkdir -p build gen obj

echo "==> 1. Compilando recursos com aapt2..."
"$AAPT2" compile --dir res -o build/compiled_res.zip

echo "==> 2. Vinculando recursos e gerando R.java..."
"$AAPT2" link -I "$ANDROID_JAR" \
    build/compiled_res.zip \
    --manifest AndroidManifest.xml \
    --java gen \
    -A assets \
    -o build/app-unaligned.apk

echo "==> 3. Compilando código Java..."
"$JAVA_HOME/bin/javac" \
    --release 8 \
    -cp "$ANDROID_JAR" \
    -d obj \
    gen/com/lh44/game/R.java \
    src/com/lh44/game/MainActivity.java

echo "==> 4. Convertendo bytecode para DEX com d8..."
"$D8" --lib "$ANDROID_JAR" --output build obj/com/lh44/game/*.class

echo "==> 5. Adicionando classes.dex no APK..."
cd build
zip -u app-unaligned.apk classes.dex
cd "$PROJECT_DIR"

echo "==> 6. Alinhando APK com zipalign (4 bytes)..."
"$ZIPALIGN" -f -p 4 build/app-unaligned.apk build/app-aligned.apk

echo "==> 7. Gerando keystore de assinatura (se necessário)..."
if [ ! -f release.keystore ]; then
    "$JAVA_HOME/bin/keytool" -genkeypair -v \
        -keystore release.keystore \
        -alias lh44 \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -storepass lh44game \
        -keypass lh44game \
        -dname "CN=LH44, OU=Racing, O=LH44, L=SaoPaulo, ST=SP, C=BR"
fi

echo "==> 8. Assinando APK com apksigner (v1, v2, v3)..."
"$APKSIGNER" sign \
    --ks release.keystore \
    --ks-key-alias lh44 \
    --ks-pass pass:lh44game \
    --key-pass pass:lh44game \
    --out "$OUTPUT_APK" \
    build/app-aligned.apk

echo "==> 9. Verificando assinatura do APK..."
"$APKSIGNER" verify --verbose "$OUTPUT_APK"

echo ""
echo "=========================================================="
echo " APK GERADO COM SUCESSO: $OUTPUT_APK"
ls -lh "$OUTPUT_APK"
echo "=========================================================="
