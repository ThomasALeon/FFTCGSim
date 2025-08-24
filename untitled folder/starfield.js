
const canvas = document.getElementById('starfield');
const ctx = canvas.getContext('2d');
let stars = [];
let numStars = 120;
function init(){ canvas.width = innerWidth; canvas.height = innerHeight; stars=[];
  for(let i=0;i<numStars;i++){ stars.push({x:Math.random()*canvas.width,y:Math.random()*canvas.height,z:Math.random()*canvas.width}); }
}
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const g = ctx.createLinearGradient(0,0,0,canvas.height);
  g.addColorStop(0,'#0b1a2b'); g.addColorStop(1,'#081126');
  ctx.fillStyle = g; ctx.fillRect(0,0,canvas.width,canvas.height);
  for(let s of stars){
    s.z -= 1.2;
    if(s.z<=0){ s.x=Math.random()*canvas.width; s.y=Math.random()*canvas.height; s.z=canvas.width; }
    let k = 128/s.z;
    let sx = s.x*k + canvas.width/2 - canvas.width/2;
    let sy = s.y*k + canvas.height/2 - canvas.height/2;
    let size = (1 - s.z/canvas.width)*2;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(sx,sy,size,size);
  }
  requestAnimationFrame(draw);
}
window.addEventListener('resize', init);
init(); draw();
