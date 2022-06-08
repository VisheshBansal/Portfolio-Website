<template>
  <div>
    <h2>Music</h2>
    <p>My most recently played tracks on Spotify are:</p>
    <ul>
      <li>
        {{ song1 }} —
        <span class="italics">{{ artist1 }}</span>
      </li>
      <li>
        {{ song2 }} —
        <span class="italics">{{ artist2 }}</span>
      </li>
      <li>
        {{ song3 }} —
        <span class="italics">{{ artist3 }}</span>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: "Colophon",
  props: {
    song1: String,
    song2: String,
    song3: String,
    artist1: String,
    artist2: String,
    artist3: String,
  },
};
</script>

<style scoped>
div {
  width: 100%;
}

h2 {
  font-weight: 500;
  color: white;
  font-size: 1.8rem;
  border-bottom: 10px solid green;
  line-height: 0.4;
  width: 40px;
  transition: all ease 0.3s;
}

h2:hover {
  font-size: 1.8rem;
  font-weight: 500;
  color: white;
  border-bottom: 10px solid #1DB954;
  line-height: 0.4;
  width: 75px;
  transition: 0.5s;
}

p {
  color: white;
  font-weight: 300;
  font-size: 1rem;
  line-height: 20px;
}

ul {
  color: white;
  margin-block-start: 0;
  padding-inline-start: 20px;
  margin-left: 10px;
  list-style-type: hiragana;
  margin-block-end: 0;
}

li {
  line-height: 1.3;
  padding-bottom: 4px;
}

@media screen and (max-width: 610px) {
  div {
    width: 100%;
  }
}

.italics {
  font-style: italic;
}
</style>
