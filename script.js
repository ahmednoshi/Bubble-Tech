import Spheres1Background from 'https://cdn.jsdelivr.net/npm/threejs-components@0.0.17/build/backgrounds/spheres1.cdn.min.js'

const bg = Spheres1Background(document.getElementById('webgl-canvas'), {
  count: 300,
  minSize: 0.3,
  maxSize: 1,
  gravity: 0.5,
  colors: [0x4169E1, 0x008080, 0xE6E6FA]

})

// document.body.addEventListener('click', () => {
//   bg.spheres.setColors([0xffffff * Math.random(), 0xffffff * Math.random(), 0xffffff * Math.random()])
// })

// document.body.addEventListener('keydown', (ev) => {
//  bg.spheres.config.gravity = bg.spheres.config.gravity === 0 ? 1 : 0
// })

document.getElementById('gravity-btn').addEventListener('click', () => {
  bg.spheres.config.gravity = bg.spheres.config.gravity === 0 ? 1 : 0
})

document.getElementById('colors-btn').addEventListener('click', () => {
  bg.spheres.setColors([0xffffff * Math.random(), 0xffffff * Math.random(), 0xffffff * Math.random()])
})




document.addEventListener("DOMContentLoaded", (event) => {
  
gsap.registerPlugin(Draggable, InertiaPlugin)

function initSlider(){

  const wrapper = document.querySelector('[data-slider="list"]')  
  const slides = gsap.utils.toArray('[data-slider="slide"]');
  
  const nextButton = document.querySelector('[data-slider="button-next"]')
  const prevButton = document.querySelector('[data-slider="button-prev"]')
  
  const totalElement = document.querySelector('[data-slide-count="total"]');
  const stepElement = document.querySelector('[data-slide-count="step"]');
  const stepsParent = stepElement.parentElement;
  
  let activeElement;
  const totalSlides = slides.length;

  // Update total slides text, prepend 0 if less than 10
  totalElement.textContent = totalSlides < 10 ? `0${totalSlides}` : totalSlides;

  // Create step elements dynamically
  stepsParent.innerHTML = ''; // Clear any existing steps
  slides.forEach((_, index) => {
    const stepClone = stepElement.cloneNode(true); // Clone the single step
    stepClone.textContent = index + 1 < 10 ? `0${index + 1}` : index + 1;
    stepsParent.appendChild(stepClone); // Append to the parent container
  });

  // Dynamically generated steps
  const allSteps = stepsParent.querySelectorAll('[data-slide-count="step"]');
  
  const loop = horizontalLoop(slides, {
    paused: true, 
    draggable: true, 
    center: false,
    onChange: (element, index) => { 
      
      // We add the active class to the 'next' element because our design is offset slightly.
      activeElement && activeElement.classList.remove("active");
      const nextSibling = element.nextElementSibling || slides[0]; 
      nextSibling.classList.add("active");
      activeElement = nextSibling;
      
      // Move the number to the correct spot
      gsap.to(allSteps, { y: `${-100 * index}%`, ease: "power3", duration: 0.45 });
    }
  });
  
  // Similar to above, we substract 1 from our clicked index on click because our design is offset
  slides.forEach((slide, i) => slide.addEventListener("click", () => loop.toIndex(i - 1, {ease:"power3",duration: 0.725})));
  
  nextButton.addEventListener("click", () => loop.next({ease:"power3", duration: 0.725}));
  prevButton.addEventListener("click", () => loop.previous({ease:"power3", duration: 0.725}));

}

function horizontalLoop(items, config) {
  let timeline;
  items = gsap.utils.toArray(items);
  config = config || {};
  gsap.context(() => { 
    let onChange = config.onChange,
      lastIndex = 0,
      tl = gsap.timeline({repeat: config.repeat, onUpdate: onChange && function() {
          let i = tl.closestIndex();
          if (lastIndex !== i) {
            lastIndex = i;
            onChange(items[i], i);
          }
        }, paused: config.paused, defaults: {ease: "none"}, onReverseComplete: () => tl.totalTime(tl.rawTime() + tl.duration() * 100)}),
      length = items.length,
      startX = items[0].offsetLeft,
      times = [],
      widths = [],
      spaceBefore = [],
      xPercents = [],
      curIndex = 0,
      indexIsDirty = false,
      center = config.center,
      pixelsPerSecond = (config.speed || 1) * 100,
      snap = config.snap === false ? v => v : gsap.utils.snap(config.snap || 1), // some browsers shift by a pixel to accommodate flex layouts, so for example if width is 20% the first element's width might be 242px, and the next 243px, alternating back and forth. So we snap to 5 percentage points to make things look more natural
      timeOffset = 0,
      container = center === true ? items[0].parentNode : gsap.utils.toArray(center)[0] || items[0].parentNode,
      totalWidth,
      getTotalWidth = () => items[length-1].offsetLeft + xPercents[length-1] / 100 * widths[length-1] - startX + spaceBefore[0] + items[length-1].offsetWidth * gsap.getProperty(items[length-1], "scaleX") + (parseFloat(config.paddingRight) || 0),
      populateWidths = () => {
        let b1 = container.getBoundingClientRect(), b2;
        items.forEach((el, i) => {
          widths[i] = parseFloat(gsap.getProperty(el, "width", "px"));
          xPercents[i] = snap(parseFloat(gsap.getProperty(el, "x", "px")) / widths[i] * 100 + gsap.getProperty(el, "xPercent"));
          b2 = el.getBoundingClientRect();
          spaceBefore[i] = b2.left - (i ? b1.right : b1.left);
          b1 = b2;
        });
        gsap.set(items, { // convert "x" to "xPercent" to make things responsive, and populate the widths/xPercents Arrays to make lookups faster.
          xPercent: i => xPercents[i]
        });
        totalWidth = getTotalWidth();
      },
      timeWrap,
      populateOffsets = () => {
        timeOffset = center ? tl.duration() * (container.offsetWidth / 2) / totalWidth : 0;
        center && times.forEach((t, i) => {
          times[i] = timeWrap(tl.labels["label" + i] + tl.duration() * widths[i] / 2 / totalWidth - timeOffset);
        });
      },
      getClosest = (values, value, wrap) => {
        let i = values.length,
          closest = 1e10,
          index = 0, d;
        while (i--) {
          d = Math.abs(values[i] - value);
          if (d > wrap / 2) {
            d = wrap - d;
          }
          if (d < closest) {
            closest = d;
            index = i;
          }
        }
        return index;
      },
      populateTimeline = () => {
        let i, item, curX, distanceToStart, distanceToLoop;
        tl.clear();
        for (i = 0; i < length; i++) {
          item = items[i];
          curX = xPercents[i] / 100 * widths[i];
          distanceToStart = item.offsetLeft + curX - startX + spaceBefore[0];
          distanceToLoop = distanceToStart + widths[i] * gsap.getProperty(item, "scaleX");
          tl.to(item, {xPercent: snap((curX - distanceToLoop) / widths[i] * 100), duration: distanceToLoop / pixelsPerSecond}, 0)
            .fromTo(item, {xPercent: snap((curX - distanceToLoop + totalWidth) / widths[i] * 100)}, {xPercent: xPercents[i], duration: (curX - distanceToLoop + totalWidth - curX) / pixelsPerSecond, immediateRender: false}, distanceToLoop / pixelsPerSecond)
            .add("label" + i, distanceToStart / pixelsPerSecond);
          times[i] = distanceToStart / pixelsPerSecond;
        }
        timeWrap = gsap.utils.wrap(0, tl.duration());
      },
      refresh = (deep) => {
        let progress = tl.progress();
        tl.progress(0, true);
        populateWidths();
        deep && populateTimeline();
        populateOffsets();
        deep && tl.draggable ? tl.time(times[curIndex], true) : tl.progress(progress, true);
      },
      onResize = () => refresh(true),
      proxy;
    gsap.set(items, {x: 0});
    populateWidths();
    populateTimeline();
    populateOffsets();
    window.addEventListener("resize", onResize);
    function toIndex(index, vars) {
      vars = vars || {};
      (Math.abs(index - curIndex) > length / 2) && (index += index > curIndex ? -length : length); // always go in the shortest direction
      let newIndex = gsap.utils.wrap(0, length, index),
        time = times[newIndex];
      if (time > tl.time() !== index > curIndex && index !== curIndex) { // if we're wrapping the timeline's playhead, make the proper adjustments
        time += tl.duration() * (index > curIndex ? 1 : -1);
      }
      if (time < 0 || time > tl.duration()) {
        vars.modifiers = {time: timeWrap};
      }
      curIndex = newIndex;
      vars.overwrite = true;
      gsap.killTweensOf(proxy);    
      return vars.duration === 0 ? tl.time(timeWrap(time)) : tl.tweenTo(time, vars);
    }
    tl.toIndex = (index, vars) => toIndex(index, vars);
    tl.closestIndex = setCurrent => {
      let index = getClosest(times, tl.time(), tl.duration());
      if (setCurrent) {
        curIndex = index;
        indexIsDirty = false;
      }
      return index;
    };
    tl.current = () => indexIsDirty ? tl.closestIndex(true) : curIndex;
    tl.next = vars => toIndex(tl.current()+1, vars);
    tl.previous = vars => toIndex(tl.current()-1, vars);
    tl.times = times;
    tl.progress(1, true).progress(0, true); // pre-render for performance
    if (config.reversed) {
      tl.vars.onReverseComplete();
      tl.reverse();
    }
    if (config.draggable && typeof(Draggable) === "function") {
      proxy = document.createElement("div")
      let wrap = gsap.utils.wrap(0, 1),
        ratio, startProgress, draggable, dragSnap, lastSnap, initChangeX, wasPlaying,
        align = () => tl.progress(wrap(startProgress + (draggable.startX - draggable.x) * ratio)),
        syncIndex = () => tl.closestIndex(true);
      typeof(InertiaPlugin) === "undefined" && console.warn("InertiaPlugin required for momentum-based scrolling and snapping. https://greensock.com/club");
      draggable = Draggable.create(proxy, {
        trigger: items[0].parentNode,
        type: "x",
        onPressInit() {
          let x = this.x;
          gsap.killTweensOf(tl);
          wasPlaying = !tl.paused();
          tl.pause();
          startProgress = tl.progress();
          refresh();
          ratio = 1 / totalWidth;
          initChangeX = (startProgress / -ratio) - x;
          gsap.set(proxy, {x: startProgress / -ratio});
        },
        onDrag: align,
        onThrowUpdate: align,
        overshootTolerance: 0,
        inertia: true,
        snap(value) {
          if (Math.abs(startProgress / -ratio - this.x) < 10) {
            return lastSnap + initChangeX
          }
          let time = -(value * ratio) * tl.duration(),
            wrappedTime = timeWrap(time),
            snapTime = times[getClosest(times, wrappedTime, tl.duration())],
            dif = snapTime - wrappedTime;
          Math.abs(dif) > tl.duration() / 2 && (dif += dif < 0 ? tl.duration() : -tl.duration());
          lastSnap = (time + dif) / tl.duration() / -ratio;
          return lastSnap;
        },
        onRelease() {
          syncIndex();
          draggable.isThrowing && (indexIsDirty = true);
        },
        onThrowComplete: () => {
          syncIndex();
          wasPlaying && tl.play();
        }
      })[0];
      tl.draggable = draggable;
    }
    tl.closestIndex(true);
    lastIndex = curIndex;
    onChange && onChange(items[curIndex], curIndex);
    timeline = tl;
    return () => window.removeEventListener("resize", onResize); 
  });
  return timeline;
}
  
initSlider()

});






const testimonialTrack = document.getElementById('testimonialTrack');
const testimonialSlides = testimonialTrack.children.length;
let testimonialIndex = 0;
let testimonialInterval = null;

function updateTestimonialSlide() {
  testimonialTrack.style.transform = `translateX(-${testimonialIndex * 100}%)`;
}

function nextTestimonial() {
  testimonialIndex = (testimonialIndex + 1) % testimonialSlides;
  updateTestimonialSlide();
}

function prevTestimonial() {
  testimonialIndex = (testimonialIndex - 1 + testimonialSlides) % testimonialSlides;
  updateTestimonialSlide();
}

function startTestimonialAuto() {
  testimonialInterval = setInterval(nextTestimonial, 4000);
}

function stopTestimonialAuto() {
  clearInterval(testimonialInterval);
}

window.addEventListener('DOMContentLoaded', () => {
  updateTestimonialSlide();
  startTestimonialAuto();
});

document.getElementById('testimonialPrev').addEventListener('click', () => {
  stopTestimonialAuto();
  prevTestimonial();
  startTestimonialAuto();
});

document.getElementById('testimonialNext').addEventListener('click', () => {
  stopTestimonialAuto();
  nextTestimonial();
  startTestimonialAuto();
});








const data = [
  // 1st Set
  {
    name: "Iphone 14 Pro Max",
    img: "./img/05c34b8d-5bb1-4280-b621-6beced8ad4e3.jpeg",
    p: "The iPhone 14 Pro Max features a Super Retina XDR display with 120Hz and a powerful camera upgrade."
  },
  {
    name: "AirPods Pro (2nd Gen)",
    img: "./image2/5a000b4a-2eab-4fdd-a98b-52b7ddba02c4.jpeg",
    p: "Features active noise cancellation and improved sound with H2 chip."
  },
  {
    name: "iPad Pro 12.9-inch (M2)",
    img: "./imgipad/32cd0085-ccbb-4490-9b97-e68d49938e95.jpeg",
    p: "Powerful iPad with M2 chip, ideal for creative and professional work."
  },
  {
    name: "Apple Watch Series 8",
    img: "/imgwatch/505871a0-b9e4-4986-b753-5ade1b137119.jpeg",
    p: "Apple Watch Series 8 features advanced health sensors and longer battery life."
  },
  {
    name: "MacBook Air M1",
    img: "./imgmack/Shop all black clothing and accessories.jpeg",
    p: "The MacBook Air M1 offers impressive performance with the M1 chip, excellent battery life, and a sleek design."
  },

  // 2nd Set
  {
    name: "Iphone 15 Pro Max",
    img: "./img/1ac24847-5481-4fdb-af03-d494f630e003.jpeg",
    p: "The iPhone 15 Pro Max offers excellent performance with the A16 chip and an upgraded camera for stunning photos."
  },
  {
    name: "AirPods Max",
    img: "./image2/Elevate Your Listening Experience with AirPods Pro 2.jpeg",
    p: "Offers spatial audio and better battery life in a compact design."
  },
  {
    name: "iPad Air 5th Gen",
    img: "./imgipad/464a4951-41d2-456e-9cd6-ee7f6437dbc3.jpeg",
    p: "Lightweight and fast with M1 chip, perfect for everyday use."
  },
  {
    name: "Apple Watch Series 7",
    img: "./imgwatch/Magnetic Milanese Watchband Compatible With Apple Watch.jpeg",
    p: "Stylish and reliable with key health features and durable design."
  },
  {
    name: "MacBook Pro 13-inch M1",
    img: "./imgmack/Macbook Pro mockup with reflections - Freebiesbug.jpeg",
    p: "The MacBook Pro 13-inch M1 delivers powerful performance with the M1 chip, a Retina display, and extended battery life."
  },

  // 3rd Set
  {
    name: "Iphone 16 Pro Max",
    img: "./img/86cf5a1f-e09f-44e5-8b31-5a87a4275bdb.jpeg",
    p: "The iPhone 16 Pro Max introduces a Dynamic Island display and powerful processor with an advanced camera."
  },
  {
    name: "AirPods (3rd Gen)",
    img: "./image2/Fone.jpeg",
    p: "Premium over-ear headphones with high-fidelity sound and noise cancellation."
  },
  {
    name: "iPad Mini 6th Gen",
    img: "./imgipad/Apple iPad Pro 13 - M4 - 256gb _ Wifi _ Space Gray.jpeg",
    p: "Colorful design with A14 chip, great for students and casual users."
  },
  {
    name: "Apple Watch SE",
    img: "./imgwatch/🍎.jpeg",
    p: "Affordable Apple Watch with core features and sleek design."
  },
  {
    name: "MacBook Pro 14-inch M1 Pro",
    img: "./imgmack/MacBook Pro M2 - Md_ Hamim Hasan.jpeg",
    p: "The MacBook Pro 14-inch with M1 Pro chip provides enhanced processing power and a stunning Liquid Retina XDR display."
  },

  // 4th Set
  {
    name: "Iphone 13 Pro Max",
    img: "./img/e3c85316-b26a-4f77-8846-9ade1eb74c59.jpeg",
    p: "The iPhone 13 Pro Max offers a Super Retina XDR display and great performance with the A15 chip."
  },
  {
    name: "AirPods Pro 2nd Gen",
    img: "./imgwatch/f8f7e559-aeb2-47c7-aec0-50bfb4e678ef.jpeg",
    p: "AirPods Pro 2nd Gen offers improved sound and noise cancellation."
  },
  {
    name: "iPad 10th Gen",
    img: "./imgipad/iPad 10 – Unleash Power & Performance with the Latest Model.jpeg",
    p: "Compact and portable with A15 chip, ideal for reading and quick tasks."
  },
  {
    name: "Apple Watch Ultra",
    img: "./imgwatch/ultra.jpeg",
    p: "Rugged design and high-end features for extreme sports and adventure."
  },
  {
    name: "MacBook Pro 16-inch M1 Pro",
    img: "./imgmack/b43d2951-477c-443e-9bd1-868a04f2293c.jpeg",
    p: "The MacBook Pro 16-inch M1 Pro is designed for professionals with a large display, powerful M1 Pro chip, and long battery life."
  }
];


const container = document.getElementById("cards-container");
const counter = document.getElementById("counter");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

let current = 1;
const total = data.length;

function renderCards() {
  container.innerHTML = "";
  data.forEach((person, index) => {
    const i = index + 1;
    const angle = [4, -8, -7, 11, 13, -17, 20][index] || 0;
    container.innerHTML += `
      <input type="radio" id="radio-${i}" name="radio-card" ${i === current ? "checked" : ""}>
      <article class="card" style="--angle:${angle}deg">
        <img class="card-img" src="${person.img}" />
        <div class="card-data">
          <h2>${person.name}</h2>
          <p>${person.p}</p>
        </div>
      </article>
    `;
  });

  counter.textContent = `${current}/${total}`;
}

prevBtn.onclick = () => {
  current = current === 1 ? total : current - 1;
  renderCards();
};

nextBtn.onclick = () => {
  current = current === total ? 1 : current + 1;
  renderCards();
};

renderCards();

