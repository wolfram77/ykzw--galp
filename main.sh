#!/usr/bin/env bash
src="ykzw--galp"
out="$HOME/Logs/$src$1.log"
ulimit -s unlimited
printf "" > "$out"

# Download source code
if [[ "$DOWNLOAD" != "0" ]]; then
  rm -rf $src
  git clone --recursive https://github.com/wolfram77/$src
  cd $src
fi

# Compile the source code
cd ..
if [ ! -d "nccl" ]; then
  git clone https://github.com/NVIDIA/nccl
  cd nccl
  make -j32 src.build
  cd ..
fi
cd $src/label_propagation
make -j32
if [ $? -ne 0 ]; then exit 1; fi
cd ../../nccl/build/lib
libnccl="$(pwd)"
cd ../../../$src

# Convert graph to edgelist, run Networkit ParallelLeiden, and clean up
runGalp() {
  export LD_LIBRARY_PATH="$libnccl:$LD_LIBRARY_PATH"
  bin="label_propagation/bin/galp"
  stdbuf --output=L printf "Converting $1 to $1.txt ...\n"   | tee -a "$out"
  lines="$(node process.js header-lines "$1")"
  tail -n +$((lines+1)) "$1" > "$1.txt"
  stdbuf --output=L ./"$bin" "$2" "0" "$1.txt"          2>&1 | tee -a "$out"
  stdbuf --output=L printf "\n\n"                              | tee -a "$out"
  rm -rf "$1.txt"
}

# Run GALP on all graphs
runAll() {
  # runGalp "$HOME/Data/web-Stanford.mtx" "$1"
  runGalp "$HOME/Data/indochina-2004.mtx" "$1"
  runGalp "$HOME/Data/uk-2002.mtx" "$1"
  runGalp "$HOME/Data/arabic-2005.mtx" "$1"
  runGalp "$HOME/Data/uk-2005.mtx" "$1"
  runGalp "$HOME/Data/webbase-2001.mtx" "$1"
  runGalp "$HOME/Data/it-2004.mtx" "$1"
  runGalp "$HOME/Data/sk-2005.mtx" "$1"
  runGalp "$HOME/Data/com-LiveJournal.mtx" "$1"
  runGalp "$HOME/Data/com-Orkut.mtx" "$1"
  runGalp "$HOME/Data/asia_osm.mtx" "$1"
  runGalp "$HOME/Data/europe_osm.mtx" "$1"
  runGalp "$HOME/Data/kmer_A2a.mtx" "$1"
  runGalp "$HOME/Data/kmer_V1r.mtx" "$1"
}

# Run GALP 5 times for each graph
for i in {1..5}; do
  runAll 0
done

# Signal completion
curl -X POST "https://maker.ifttt.com/trigger/puzzlef/with/key/${IFTTT_KEY}?value1=$src$1"
