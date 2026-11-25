#!/usr/bin/env bash
set -eu
app=br.pucrs.ages.hangy
mkdir -p qa-evidence
adb install -r hangy.apk
adb shell input keyevent KEYCODE_WAKEUP
adb shell wm dismiss-keyguard
for i in 1 2 3; do
  adb shell am force-stop "$app"
  adb logcat -c
  adb shell am start -W -n "$app/.MainActivity"
  passed=false
  for attempt in {1..15}; do
    sleep 2
    adb logcat -b crash -d > "qa-evidence/crash-$i.txt"
    if grep -q "Process: $app," "qa-evidence/crash-$i.txt"; then
      cat "qa-evidence/crash-$i.txt"
      exit 1
    fi
    adb shell uiautomator dump /sdcard/window.xml >/dev/null 2>&1 || continue
    adb shell cat /sdcard/window.xml > "qa-evidence/ui-$i.xml"
    if grep -qiE 'Entrar|Senha|E-mail' "qa-evidence/ui-$i.xml" && adb shell pidof "$app" >/dev/null; then
      passed=true
      break
    fi
  done
  adb exec-out screencap -p > "qa-evidence/launch-$i.png"
  "$passed" || { echo "Login did not appear"; exit 1; }
done
