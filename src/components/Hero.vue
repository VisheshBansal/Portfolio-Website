<template>
  <div class="hero">
    <div class="image-holder">
      <img src="https://neenja.netlify.app/assets/Vishesh%20Bansal.png" alt="Image of Vishesh Bansal"/>
    </div>
    <div class="text">
      <div class="top-text">
        <h1>
          Hi, I'm Vishesh! 👋
        </h1>
        <h2>
          I'm a
         <span><vue-typer
              :text='["Developer","Designer","ML Enthusiast","CyberSec Enthusiast"]'
              :repeat='Infinity'
              :shuffle='false'
              initial-action='typing'
              :pre-type-delay='70'
              :type-delay='70'
              :pre-erase-delay='2000'
              :erase-delay='250'
              erase-style='select-all'
              :erase-on-complete='false'
              caret-animation='blink'
          ></vue-typer></span> from Gurgaon.
        </h2>
      </div>
      <div class="bottom-text">
        <p class="b-margin">
          I'm a sophomore CS student at <a
            target="_blank"
            rel="noopener noreferrer"
            class="green"
            href="https://vit.ac.in"
        >Vellore Institute of Technology</a
        >, an alumni of <a
            target="_blank"
            rel="noopener noreferrer"
            class="green"
            href="https://dpsgurgaon.org"
        >Delhi Public School, Gurgaon</a> I'm an Cyber Security and Machine Learning Enthusiast with a focus on
          front-end and
          back-end in Node.js.
        </p>
        <p class="b-margin">
          I also love digital art. I am learning UI/UX designing
          using Figma. Other tools which I use are Adobe Photoshop and Illustrator. I am an avid book reader and music
          listener.
        </p>
        <p>
          My favourite colour
          is <span class="color">#7CFC06</span>.
        </p>
        <br><br>
        <p class="bold fa-bold">
          Check out my Social Profiles:
        </p>
      </div>
      <ul>
        <a
            href="https://twitter.com/VisheshBansal17"
            target="_blank"
            rel="noopener noreferrer"
        >
          <li class="first"><i class="fab fa-twitter fa-lg"></i></li>
        </a>
        <a
            href="https://instagram.com/thevisheshbansal"
            target="_blank"
            rel="noopener noreferrer"
        >
          <li><i class="fab fa-instagram fa-lg"></i></li>
        </a>
        <a
            href="https://github.com/VisheshBansal"
            target="_blank"
            rel="noopener noreferrer"
        >
          <li><i class="fab fa-kaggle fa-lg"></i></li>
        </a>
        <a
            href="https://www.behance.net/visheshbansal"
            target="_blank"
            rel="noopener noreferrer"
        >
          <li class="last">
            <i class="fab fa-behance-square fa-lg"></i>
          </li>
        </a>
      </ul>
    </div>
  </div>
</template>

<script>
import { VueTyper } from 'vue-typer'
export default {
  name: "Hero",
  components: {
    VueTyper
  }
};
</script>

<style scoped>
.color {
  /* border-bottom: 4px solid #1da7ea; */
  color: lawngreen;
}

ul {
  margin: 0;
  list-style-type: none;
  display: flex;
  flex-direction: row;
}

li {
  margin-left: 2rem;
  padding: 10px;
  display: flex;
  border-radius: 8px;
  justify-content: center;
  align-items: center;
  background-color: #1b405e;
  transition: all ease 0.2s;
}

li:hover {
  background-color: #18D26E;
  transform: translateY(-5px);
  transition: all ease 0.2s;
}

::v-deep .typed  {
  color: lawngreen !important;
}
::v-deep .custom.caret {
  background-color: green !important;
}

.fa-twitter {
  color: #fff;
}

.fa-instagram {
  color: #fff;
}

.fa-github {
  color: #fff;
}

.fa-kaggle {
  color: #fff;
}

.fa-envelope {
  color: #fff;
}

.fa-behance-square {
  color: #fff;
}


.green {
  color: #18D26E;
  text-decoration: none;
  font-weight: bolder;
  margin: 5px;
  transition: siz;
}

.green:hover {
  color: lawngreen;
  text-decoration: none;
  font-weight: bolder;
  margin: 5px;
  transition: siz;
}

img {
  height: 400px;
  border-radius: 8px;
}

.b-margin {
  margin-bottom: 1rem;
}

.image-holder {
  height: 125px;
}

.hero {
  display: flex;
}

.text {
  height: 400px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: white;
  margin-left: 2rem;
}

h1,
p {
  margin: 0;
}

h1 {
  font-weight: 500;
  font-size: 1.8rem;
}

h2 {
  font-weight: 500;
  font-size: 1.8rem;
}

p {
  font-weight: 300;
  font-size: 1rem;
  line-height: 1.3;
  /* text-align: justify; */
}

.changing-text{
  color: lawngreen;
}

@media screen and (max-width: 1258px) {
  .hero {
    flex-direction: column;
  }

  img {
    height: 150px;
    width: auto;
    clip-path: circle(60px at center);
    position: relative;
    top: -20px;
    margin: 0;
  }

  .text {
    margin-left: 0;
    height: auto;
  }

  h1 {
    margin-bottom: 1rem;
    margin-top: 1rem;
  }
}
</style>
