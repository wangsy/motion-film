#!/bin/bash
# 사용: finish.sh <name> [fps=60] [frames=900]
# 전제: out/frames/%04d.png, out/music.raw.wav, out/sfx.raw.wav (없으면 무음)
# 산출: out/<name>.mp4, out/<name>_music-only.m4a, out/contact-sheet.png, QA 수치 출력
set -e
NAME=${1:?name}; FPS=${2:-60}; FRAMES=${3:-900}; DUR=$(echo "scale=3; $FRAMES/$FPS" | bc)
cd "${PROJECT_DIR:-.}"
if [ -f out/music.raw.wav ]; then
  if [ -f out/sfx.raw.wav ]; then
    ffmpeg -y -v error -i out/music.raw.wav -i out/sfx.raw.wav -filter_complex "[0][1]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11:linear=true[a]" -map "[a]" -ar 48000 out/mix.wav
  else
    ffmpeg -y -v error -i out/music.raw.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:linear=true -ar 48000 out/mix.wav
  fi
  ffmpeg -y -v error -i out/music.raw.wav -af loudnorm=I=-14:TP=-1.5:linear=true -c:a aac -b:a 256k "out/${NAME}_music-only.m4a"
  ffmpeg -y -v error -framerate $FPS -i out/frames/%04d.png -i out/mix.wav -map 0:v -map 1:a -c:v libx264 -pix_fmt yuv420p -crf 16 -c:a aac -b:a 256k -t $DUR "out/$NAME.mp4"
else
  ffmpeg -y -v error -framerate $FPS -i out/frames/%04d.png -c:v libx264 -pix_fmt yuv420p -crf 16 -t $DUR "out/$NAME.mp4"
fi
STEP=$(( FRAMES / 16 ))
ffmpeg -y -v error -i "out/$NAME.mp4" -vf "select='not(mod(n\,$STEP))',scale=480:-1,tile=4x4" -frames:v 1 -update 1 out/contact-sheet.png
echo "== format"; ffprobe -v error -select_streams v -show_entries stream=width,height,r_frame_rate,nb_frames -of csv=p=0 "out/$NAME.mp4"
echo "== freezes >0.5s (기준: 0개)"; ffmpeg -i "out/$NAME.mp4" -vf "freezedetect=n=0.0005:d=0.5" -an -f null - 2>&1 | grep -E "freeze_(start|duration)" | grep -v metadata || echo none
echo "== loudness (기준: ~-14 LUFS, peak <= -1)"; ffmpeg -i "out/$NAME.mp4" -af ebur128=peak=true -f null - 2>&1 | grep -E " I:|Peak:" | tail -2 || true
