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
          ></vue-typer></span> from<br> Gurgaon.
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
        >Delhi Public School, Gurgaon</a> I'm a Cyber Security and Machine Learning Enthusiast with experience in
          Frontend Development.
        </p>
        <p class="b-margin">
          I also love digital art. I am learning <span class="green-text">UI/UX</span> designing
          using Figma. Other tools which I use are Adobe Photoshop and Illustrator. I am an avid book reader and music
          listener.
        </p>
        <p>
          My favourite colour
          is <span class="color">#7CFC06</span>.
        </p>
        <br><br>
        <p class="bold fa-bold">Check out my Social Profiles:
        </p>
      </div>
      <br>
      <ul>
        <a
            href="https://facebook.com/agentace.50"
            target="_blank"
            rel="noopener noreferrer"
        >
          <li><i class="fab fa-facebook fa-lg"></i></li>
        </a>
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
            href="https://www.linkedin.com/in/bansalvishesh"
            target="_blank"
            rel="noopener noreferrer"
        >
          <li class="last">
            <i class="fab fa-linkedin fa-lg"></i>
          </li>
        </a>
      </ul>
      <div class="contact">
        <p class="b-margin">
          Get in touch with me:
        </p>
        <a href="mailto:vishesh.bansal@gmail.com">
        <div class="contact-me">Contact Me</div>
        </a>
      </div>
    </div>
    <br><br><br>
  </div>
</template>

<script>
import {VueTyper} from 'vue-typer'

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

::v-deep .typed {
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

.fa-facebook {
  color: #fff;
}

.green {
  color: #18D26E;
  text-decoration: none;
  font-weight: bolder;
  margin: 5px;
  transition: siz;
}

.green-text {
  color: lawngreen;
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
  margin-bottom: 12rem;
}

.text {
  height: 400px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: white;
  margin-left: 2rem;
}
a{
  text-decoration: none;
}

.contact{
  margin-top:2rem;
}
.contact-me{
  font-size: 1.1rem;
  font-weight: 500;
  background-color: #1b405e;
  color:white;
  border-radius:8px;
  text-align: center;
  padding:10px;
  vertical-align: center;
}
.contact-me:hover{
  background-color: #18D26E;
  transform: translateY(-5px);
  transition: all ease 0.2s;
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

.fa-linkedin {
  color: white;
}

@media screen and (max-width: 1258px) {
  .hero {
    flex-direction: column;
    margin-bottom: 0rem;
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

  li {
    margin-right: 0.5rem;
    margin-left: 0.5rem;
  }

  .contact {
    margin-top:16px;
  }
}
</style>
