<template>
  <div class="contact">
    <h1>Contact</h1>
    <p class="touch-para" style="padding-top:16px">Let's Get in <span class="green-text" style="padding:0 2px;">Touch</span>.</p>
    <h4>Primary</h4>
    <div class="wrapper">
      <div class="icon logo">
        <div class="tooltip">
          Mail
        </div>
        <span>
          <a
              href="mailto:vishesh.bansal@gmail.com"
              target="_blank"
              rel="noopener noreferrer"
          ><i class="fas fa-envelope fa-lg"></i></a></span>
      </div>
    </div>
    <div class="wrapper">
      <div class="icon logo">
        <div class="tooltip">
          Telegram
        </div>
        <span>
          <a
              href="https://t.me/visheshbansal"
              target="_blank"
              rel="noopener noreferrer"
          ><i class="fab fa-telegram fa-lg"></i></a></span>
      </div>
    </div>
    <h4>Social</h4>
    <div class="wrapper">
      <div class="icon logo">
        <div class="tooltip">
          GitHub
        </div>
        <span><a
            href="https://visheshbansal.ml/gh"
            target="_blank"
            rel="noopener noreferrer"
        ><i class="fab fa-github fa-lg"></i></a></span>
      </div>
    </div>
    <div class="wrapper">
      <div class="icon logo">
        <div class="tooltip">
          Instagram
        </div>
        <span><a
            href="https://visheshbansal.ml/instagram"
            target="_blank"
            rel="noopener noreferrer"
        ><i class="fab fa-instagram fa-lg"></i></a></span>
      </div>
    </div>
    <div class="wrapper">
      <div class="icon logo">
        <div class="tooltip">
          Twitter
        </div>
        <span><a
            href="https://visheshbansal.ml/twitter"
            target="_blank"
            rel="noopener noreferrer"
        ><i class="fab fa-twitter fa-lg"></i></a></span>
      </div>
    </div>
    <div class="wrapper">
      <div class="icon logo">
        <div class="tooltip">
          LinkedIn
        </div>
        <span><a
            href="https://visheshbansal.ml/linkedin"
            target="_blank"
            rel="noopener noreferrer"
        ><i class="fab fa-linkedin fa-lg"></i></a></span>
      </div>
    </div>
    <div style="margin-top:1.2rem;">
      <a href="https://visheshbansal.ml/resume">
        <div class="contact-me">Download Resume</div>
      </a>
    </div>
  </div>
</template>

<script>
export default {
  name: "Contact",
};
</script>

<style scoped>
h1 {
  font-weight: 500;
  color: white;
  font-size: 1.8rem;
  border-bottom: 10px solid green;
  line-height: 0.4;
  width: 40px;
  transition: all ease 0.3s;
}

h1:hover {
  font-size: 1.8rem;
  font-weight: 500;
  color: white;
  border-bottom: 10px solid #1DB954;
  line-height: 0.4;
  width: 100px;
  transition: all ease 0.3s;
}

span {
  padding: 20px;
}

.wrapper {
  display: inline-flex;
  vertical-align: center;
}

h2 {
  font-size: 1.5rem;
  font-weight: 500;
  color: white
}

h4 {
  margin-top: 1.5rem;
  font-size: 1.2rem;
  font-weight: 500;
  color: ghostwhite;
}

.touch-para {
  color: #fff;
  font-weight: 500;
  font-size: 1.4rem;
}

.green-text {
  color: lawngreen;
}

.wrapper .icon {
  margin: 0 10px;
  text-align: center;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  position: relative;
  z-index: 2;
  transition: 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.wrapper .icon span {
  display: block;
  height: 60px;
  width: 60px;
  border-radius: 50%;
  position: relative;
  z-index: 2;
  margin-bottom:1em;
  background-color: #1D2430;
  box-shadow: 0px 10px 10px rgba(0, 0, 0, 0.1);
  transition: 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.wrapper .icon span i {
  line-height: 60px;
  font-size: 25px;
}

.wrapper .icon .tooltip {
  position: absolute;
  top: 0;
  z-index: 1;
  background: #fff;
  color: #fff;
  padding: 10px 18px;
  font-size: 20px;
  font-weight: 500;
  border-radius: 25px;
  opacity: 0;
  pointer-events: none;
  box-shadow: 0px 10px 10px rgba(0, 0, 0, 0.1);
  transition: 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.wrapper .icon:hover .tooltip {
  top: -70px;
  opacity: 1;
  pointer-events: auto;
}

.fa-envelope {
  color: #fff;
}

.fa-telegram {
  color: #fff;
}

.fa-linkedin {
  color: #fff;
}

.fa-github {
  color: #fff;
}

.fa-instagram {
  color: #fff;
}

.fa-twitter {
  color: #fff;
}

a {
  text-decoration: none;
}

.contact-me {
  font-size: 1.1rem;
  font-weight: 500;
  background-color: #18D26E;
  color: white;
  border-radius: 8px;
  text-align: center;
  padding: 10px;
  vertical-align: center;
  transition: all ease 0.3s;
}

.contact-me:hover {
  transform: translateY(-5px);
  transition: all ease 0.3s;
}

.icon .tooltip:before {
  position: absolute;
  content: "";
  height: 15px;
  width: 15px;
  background: #fff;
  left: 50%;
  bottom: -6px;
  transform: translateX(-50%) rotate(45deg);
  transition: 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.wrapper .icon:hover span {
  color: #fff;
}

.wrapper .icon:hover span,
.wrapper .icon:hover .tooltip {
  text-shadow: 0px -1px 0px rgba(255, 255, 255, 0.5);
}

.wrapper .logo:hover span,
.wrapper .logo:hover .tooltip,
.wrapper .logo:hover .tooltip:before {
  background: #18D26E;
}

</style>