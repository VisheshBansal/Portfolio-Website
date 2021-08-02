<template>
  <nav>
    <div class="name" id="name">
      <h1>Vishesh Bansal</h1>
    </div>
    <ul>
      <a
          href="https://github.com/VisheshBansal"
          target="_blank"
          rel="noopener noreferrer"
      >
        <li><i class="fab fa-github fa-lg"></i></li>
      </a>
      <a
          href="https://kaggle.com/bansalvishesh"
          target="_blank"
          rel="noopener noreferrer"
      >
        <li><i class="fab fa-kaggle fa-lg"></i></li>
      </a>
      <a
          href="https://medium.com/@visheshbansal"
          target="_blank"
          rel="noopener noreferrer"
      >
        <li><i class="fab fa-medium fa-lg"></i></li>
      </a>
      <a
          href="https://www.behance.net/visheshbansal"
          target="_blank"
          rel="noopener noreferrer"
      >
        <li>
          <i class="fab fa-behance fa-lg"></i>
        </li>
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
  </nav>
</template>

<script>
export default {
  name: "Navbar",
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
nav {
  color: white;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.name {
  display: flex;
  align-items: flex-end;
}

.name h1 {
  margin: 0 0 0 0;
  font-size: 1.8rem;
  font-weight: 600;
  border-bottom: 6px solid #18D26E;
  line-height: 0.4;
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

.fa-kaggle {
  color: #fff;
}

.fa-github {
  color: #fff;
}

.fa-linkedin {
  color: #fff;
}

.fa-medium {
  color: #fff;
}

.fa-behance {
  color: #fff;
}

@media screen and (max-width: 1250px) {
  nav {
    flex-direction: column;
    margin-top: 3rem;
  }

  li {
    margin-left: 0;
    margin-right: 2rem;
  }

  ul {
    justify-content: flex-start;
    align-items: flex-start;
    padding-inline-start: 0;
    margin-top: 2rem;
  }
}

@media screen and (max-width: 570px) {
  ul {
    width: 100%;
    justify-content: space-between;
  }

  li {
    margin-left: 0;
    margin-right: 1rem;
  }

  .first {
    margin-right: 1rem;
    margin-left: 0;
  }

  .last {
    margin: 0;
  }
}

@media screen and (max-width: 410px) {
  li {
    margin-right: 0.5rem;
  }

  .first {
    margin-right: 0.5rem;
    margin-left: 0;
  }

  .last {
    margin: 0;
  }

  i {
    height: 80%;
  }
}
</style>
