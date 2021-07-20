<template>
  <div class="row">
    <div class="divider"></div>
    <Music
        :song1="song1"
        :song2="song2"
        :song3="song3"
        :artist1="artist1"
        :artist2="artist2"
        :artist3="artist3"
    ></Music>
  </div>
</template>

<script>
import Music from "./Music.vue";

export default {
  name: "ColophonMusic",
  components: {Music},
  data() {
    return {
      song1: null,
      artist1: null,
      song2: null,
      artist2: null,
      song3: null,
      artist3: null,
    };
  },
  mounted() {
    const url = "https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=VisheshBansal&api_key=06371334b3058080bf844f787357d514&format=json";
    fetch(url)
        .then((res) => res.json())
        .then((data) => {
          function removeDuplicates(arr) {
            const result = [];
            const duplicatesIndices = [];

            arr.forEach((current, index) => {
              if (duplicatesIndices.includes(index)) return;

              result.push(current);

              for (
                  let comparisonIndex = index + 1;
                  comparisonIndex < arr.length;
                  comparisonIndex++
              ) {
                const comparison = arr[comparisonIndex];
                const currentKeys = Object.keys(current);
                const comparisonKeys = Object.keys(comparison);

                if (currentKeys.length !== comparisonKeys.length)
                  continue;

                const currentKeysString = currentKeys
                    .sort()
                    .join("")
                    .toLowerCase();
                const comparisonKeysString = comparisonKeys
                    .sort()
                    .join("")
                    .toLowerCase();
                if (currentKeysString !== comparisonKeysString)
                  continue;

                let valuesEqual = true;
                for (let i = 0; i < currentKeys.length; i++) {
                  const key = currentKeys[i];
                  if (current[key] !== comparison[key]) {
                    valuesEqual = false;
                    break;
                  }
                }
                if (valuesEqual)
                  duplicatesIndices.push(comparisonIndex);
              }
            });

            return result;
          }

          let res = data.recenttracks.track;
          let songs = [];
          for (let i = 0; i < res.length; i++) {
            // add song name: artistName to object
            let song = res[i].name;
            let artist = res[i].artist["#text"];
            let object = {
              song,
              artist,
            };

            songs.push(object);
          }
          let songStripped = removeDuplicates(songs);
          let firstThree = songStripped.slice(0, 3);
          console.log(firstThree);

          this.song1 = firstThree[0].song;
          this.song2 = firstThree[1].song;
          this.song3 = firstThree[2].song;

          this.artist1 = firstThree[0].artist;
          this.artist2 = firstThree[1].artist;
          this.artist3 = firstThree[2].artist;
        });
  },
};
</script>

<style scoped>
.row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.divider {
  display: none;
  width: 100%;
  height: 3px;
  margin: 2rem 0;
}

@media screen and (max-width: 610px) {
  .divider {
    display: block;
    margin-top: -15px !important;
  }

  .row {
    flex-direction: column;
    margin-top: -40px !important;
  }
}
</style>
