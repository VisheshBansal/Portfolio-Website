<template>
  <div class="project-card">
    <a :href="project.link" target="_blank" rel="noopener noreferrer">
      <img :src="project.src" alt="behance project"/>
      <h3 class="title">{{ project.name }}</h3>
    </a>
  </div>
</template>

<script>
export default {
  name: "Design",
  props: ["project"],
};
</script>

<style scoped>
a {
  text-decoration: none;
}

.project-card {
  margin-right: 1rem;
  transition: 0.2s ease all;
}

img {
  height: 300px;
  transition: all 0.1s ease;
}

.title {
  color: white;
  font-weight: 500;
  text-align: center;
  max-width: 300px;
  text-decoration: none;
  margin: 1rem auto;
  font-size: 1.2rem;
  opacity: 1;
  transition: 0.2s ease all;
  line-height: 1;
}

div:hover {
  opacity: 0.5;
  transform: translateY(-10px);
  transition: all 0.2s ease;
}

@media screen and (max-width: 800px) {
  project.card {
    margin: 0 auto;
    align-items: center;
  }

  img {
    height: 240px;

  }
}
</style>
