<template>
  <div>
    <h2>Experience</h2>
    <div class="timeline">
      <div class="year-container">
        <span class="year">2022</span>
      </div>
      <ul>
        <br><br><br>
        <li>
          <div class="content">
            <a href="https://getonecard.app" target="_blank">
              <h3>FPL Technologies</h3>
              <h5>Security Engineer Intern</h5>
              <div class="grey">June 2022 - Present</div>
              <br>
              <div>
                - A fintech startup and parent company of the famous
                <strong>OneCard</strong> and <strong>OneScore</strong> app, re-imagining credit and payments from first
                principles!
                <br><br>
                - Currently working as a part of the Engineering Team.
              </div>

            </a>
          </div>
        </li>
        <li>
          <div class="content">
            <a href="https://cloudsek.com" target="_blank">
              <h3>CloudSEK</h3>
              <h5>Security Engineer Intern</h5>
              <div class="grey">Jan 2022 - April 2022</div>
              <br>
              <p>
                - A Cyber Security, Machine Intelligence company, enabling Artificially intelligent machines
                to mine raw data to produce cyber intelligence and that
                provides real-time visibility of cyber threats and actionable Intel.
                <br><br>
                - Worked in the Vulnerability Intelligence Team for adding enhancements to <a href="https://bevigil.com"
                                                                                              target="_blank"><strong>BeVigil</strong></a>.
              </p>
            </a>
          </div>
        </li>
        <br> <br>
      </ul>
      <div class="year-container">
        <span class="year">2021</span>
      </div>
      <ul>
        <br> <br> <br>
        <li>
          <div class="content align-left">
            <a href="https://seclogic.io" target="_blank">
              <h3>SecLogic</h3>
              <h5>Associate, Cyber Threat Intelligence Intern</h5>
              <div class="grey">May 2021 - November 2021</div>
              <br>
              <p>
                - Worked in the CTI team and developed tools and solutions for Risk Detection and Vulnerability Analysis
                and Implementing proper Cloud Security Posture Management (CSPM).
              </p>
            </a>
          </div>
        </li>
      </ul>
      <div class="green-dot"></div>
    </div>
  </div>
</template>

<script>

export default {
  name: "Experience",
}
</script>
<style scoped>
h2 {
  font-weight: 500;
  color: white;
  font-size: 1.8rem;
  border-bottom: 10px solid green;
  line-height: 0.4;
  width: 60px;
  transition: all ease 0.3s;
  margin-bottom: 2rem;
}

strong {
  font-weight: 500;
  color: #1DB954;
}

a {
  color: white;
  border: none;
  text-decoration: none;
}

.green-dot {
  width: 16px;
  height: 16px;
  background: #1DB954;
  border-radius: 50%;
  margin-left: -0.45em;
}

.year-container {
  position: absolute;
  margin: 0 -2.25em;
  z-index: 9999;
}

.year {
  color: white;
  font-weight: 500;
  font-size: 1.5rem;
  background: #1DB954;
  border-radius: 16px;
  padding: 0.5rem;
}

h2:hover {
  font-size: 1.8rem;
  font-weight: 500;
  color: white;
  border-bottom: 10px solid #1DB954;
  line-height: 0.4;
  width: 100px;
  transition: all ease 0.3s;
}

div {
  color: white;
  font-family: "canada-type-gibson" !important;
}

* {
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  font-family: 'canada-type-gibson', sans-serif;
  perspective: 800px;
}

.grey {
  color: #ddd;
  font-size: 0.9rem;
}

body {
  display: flex;
}

.timeline {
  width: 100%;
  background-color: #1a202c;
  color: #fff;
  padding: 30px 20px;
  word-wrap: normal;
}

.timeline ul {
  list-style-type: none;
  border-left: 2px solid white;
  padding: 10px 5px;
}

.timeline ul li {
  padding: 20px 20px;
  position: relative;
  cursor: pointer;
  transition: .5s;
}

.timeline ul li span {
  display: inline-block;
  border-radius: 25px;
  padding: 2px 5px;
  font-size: 15px;
  text-align: center;
}

.timeline ul li .content h3 {
  color: #1DB954;
  font-size: 1.6rem;
  padding-top: 5px;
  font-weight: 500;
  margin-bottom: 0.2rem;
}

h5 {
  font-size: 1.2rem;
  padding-top: 5px;
  font-weight: 500;
  margin-bottom: 8px;
}

.timeline ul li .content p {
  padding: 5px 0px 15px 0px;
  font-size: 15px;
}

.timeline ul li:before {
  position: absolute;
  content: '';
  width: 10px;
  height: 10px;
  background-color: lawngreen;
  border-radius: 50%;
  left: -11px;
  top: 28px;
  transition: .5s;
  margin: 0;
}

.timeline ul li:hover {
  background-color: #1b405e;
  border-radius: 8px;
}

.timeline ul li:hover:before {
  background-color: #0F0;
  box-shadow: 0px 0px 10px 2px #0F0;
}

@media (max-width: 300px) {
  .timeline {
    width: 100%;
    padding: 30px 5px 30px 10px;
  }

  .timeline ul li .content h3 {
    color: #1DB954;
    font-size: 15px;
  }

}
</style>