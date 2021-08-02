<template>
  <div id="app">
    <cursor-fx color="lawngreen"></cursor-fx>
    <div class="home">
      <div>
        <button class="scroll-top" v-on:click="scrollToTop">
          <i id="scroll-top" class="fas fa-chevron-up fa-lg"></i>
        </button>
      </div>
      <Navbar></Navbar>
      <HorizontalDivider></HorizontalDivider>
      <Hero></Hero>
      <HorizontalDivider></HorizontalDivider>
      <Skills></Skills>
      <HorizontalDivider></HorizontalDivider>
      <a name="projects"></a>
      <Code></Code>
      <HorizontalDivider></HorizontalDivider>
      <h1 class="art">Design</h1>

      <div class="art-container">
        <Art
            v-for="project in projects"
            :project="project"
            :key="project"
        ></Art>
      </div>
      <HorizontalDivider></HorizontalDivider>
      <ColophonMusic></ColophonMusic>
      <HorizontalDivider></HorizontalDivider>
      <a name="contact"></a>
      <Contact></Contact>
      <HorizontalDivider></HorizontalDivider>
      <Footer></Footer>
    </div>
  </div>

</template>

<script>
import Navbar from "./components/Navbar.vue";
import HorizontalDivider from "./components/HorizontalDivider.vue";
import Hero from "./components/Hero.vue";
import Skills from "./components/Skills.vue";
import Art from "./components/Art.vue";
import Contact from "./components/Contact.vue";
import Code from "./components/Code.vue";
import ColophonMusic from "./components/ColophonMusic.vue";
import Footer from "./components/Footer.vue";

export default {
  name: "App",
  components: {
    Navbar,
    HorizontalDivider,
    Contact,
    Hero,
    Skills,
    Art,
    Code,
    ColophonMusic,
    Footer,
  },
  data() {
    return {
      projects: null,
    };
  },
  mounted() {
    // This will break one day
    // TODO: Use own API key
    const url =
        "https://www.behance.net/v2/users/visheshbansal/projects?client_id=ZLBxK9rEfHwJf9K0rmseNr2fS2gS2HJW";
    $.ajax({
      url: url,
      type: "get",
      data: {projects: {}},
      dataType: "jsonp",
    })
        .done((response) => {
          let data = [];
          let res = response.projects;
          console.log(response);
          for (let i = 0; i < res.length; i++) {
            data.push({
              src: res[i].covers.original,
              link: res[i].url,
              name: res[i].name,
            });
          }
          this.projects = data;
        })
        .fail((error) => {
          console.error(error);
        });
  },
  methods: {
    scrollToTop() {
      window.scrollTo({top: 0, left: 0, behavior: "smooth"});
    },
  }
};
</script>

<style>
* {
  box-sizing: border-box;
}

html {
  padding: 0;
  margin: 0;
}

body {
  background-color: #1a202c;
  font-family: "canada-type-gibson";
  overflow-x:hidden;
}

::-webkit-scrollbar {
  width: 8px;
}

/* Track */
::-webkit-scrollbar-track {
  background: #2c3649;
  border-radius: 0.5rem;
}

/* Handle */
::-webkit-scrollbar-thumb {
  background: #1DB954;
  border-radius: 0.5rem;
}

/* Handle on hover */
::-webkit-scrollbar-thumb:hover {
  background: lawngreen;
}

.scroll-top {
  position: fixed;
  bottom: 15%;
  left: 85%;
  background-color: #1DB954;
  border: none;
  margin-left: 2rem;
  padding: 10px;
  display: flex;
  border-radius: 8px;
  justify-content: center;
  align-items: center;
  transition: all ease 0.2s;
  z-index: 2;
}

.scroll-top:hover {
  transform: scale(1.2);
  transition: 0.5s;
  color: white;
}

.home {
  max-width: 870px;
  margin: 2rem auto;
}

.art-container {
  display: flex;
  overflow-x: scroll;
  /* -ms-overflow-style: none;  */
  /* scrollbar-width: none; */
  padding: 10px 0;
  height: min-content;
}

.art {
  font-weight: 500;
  color: white;
  font-size: 1.8rem;
  border-bottom: 10px solid green;
  line-height: 0.4;
  width: 40px;
  transition: all ease 0.3s;
}

.art:hover {
  font-size: 1.8rem;
  font-weight: 500;
  color: white;
  border-bottom: 10px solid #1DB954;
  line-height: 0.4;
  width: 90px;
  transition: 0.5s;
}


@media screen and (max-width: 1500px) {
  .home {
    margin: 2rem 20rem;
  }
}

@media screen and (max-width: 1380px) {
  .home {
    margin: 2rem 15rem;
  }
}

@media screen and (max-width: 936px) {
  .home {
    margin: 2rem;
  }

  .scroll-top {
    visibility: hidden;
  }
}

@media screen and (max-width: 320px) {
  .home {
    margin: 2rem 1rem;
  }
}
</style>
