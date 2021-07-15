<template>
  <div>
    <div class="row">
      <h1>Code</h1>
      <div>
        <button v-on:click="expandDiv">
          <i id="chevron" class="fas fa-chevron-down fa-lg"></i>
        </button>
      </div>
    </div>

    <div class="cards">
      <Card
          v-for="card in cards"
          :key="card.title"
          :title="card.title"
          :emoji="card.emoji"
          :link="card.link"
      ></Card>
    </div>
  </div>
</template>

<script>
import Card from "./Card.vue";

export default {
  name: "Code",
  components: {Card},
  data() {
    return {
      cards: [
        {
          title: "Notifier",
          emoji: "📢",
          link: "https://github.com/GDGVIT/Notifier-Bot",
        },
        {
          title: "Vitty",
          emoji: "⏰",
          link: "https://github.com/GDGVIT/vitty-backend",
        },
      ],
    };
    // eslint-disable-next-line no-unreachable
    isExpanded = false;
  },
  methods: {
    expandDiv() {
      const div = document.querySelector(".cards");
      const chevron = document.getElementById("chevron");

      if (!this.isExpanded) {
        div.classList.add("expandedCards");
        chevron.style.transform = "rotate(180deg)";
        this.isExpanded = true;
      } else {
        div.classList.remove("expandedCards");
        chevron.style.transform = "rotate(0deg)";
        this.isExpanded = false;
      }
      console.log(div.classList);
    },
  },
};
</script>

<style scoped>
.cards {
  grid-gap: 1rem;
  margin: 0 auto;
  display: grid;
  height: 320px;
  overflow: hidden;
}

@media screen and (max-width: 1015px) {
  .cards {
    height: 275px;
  }
}

.expandedCards {
  height: 100%;
}

@media (min-width: 600px) {
  .cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

.rotate {
  transform: rotate(180deg);
}

.no-rotate {
  transform: rotate(0deg);
}

h1 {
  font-size: 1.8rem;
  font-weight: 500;
  color: white;
  border-bottom: 10px solid #18D26E;
  line-height: 0.4;
  width: 70px;
}

.row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

svg {
  color: white;
}

.row button {
  border: none;
  padding: 10px;
  border-radius: 8px;
  background-color: #1b405e;
}

.row button:hover {
  background-color: #15334b;
  transition: background-color ease 0.2s;
  cursor: pointer;
}

.row button:focus {
  outline: none;
}
</style>
