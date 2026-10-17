"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const MESSAGES = [
  "Meow! Where are we going today? 🗺️",
  "I'll plan the purrfect itinerary!",
  "Psst… try Hidden Gems mode 💎",
  "I checked the weather for you ☁️",
  "Your trip is gonna be amazing! ✨",
  "Don't forget sunscreen 😸",
  "Click me for another tip!",
  "Coffee & Cafes? Max 2 per day now 🐾",
  "Up to 4 cities in one trip! 🏙️",
  "Wayfarer AI — travel smarter, not harder 🧳",
];

const CAT_CSS = `
.wfc-color { background-color: #242424; }
.dark .wfc-color { background-color: #cbd5e1; }

.wfc-wrap {
  position: relative;
  width: 65px;
  height: 65px;
  overflow: hidden;
}
.wfc-container {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  transform: scale(0.26) translate(-712px, -170px);
}
.wfc-head {
  width: 170px;
  height: 130px;
  border-radius: 55% 55% 50% 50%;
  margin-left: 718px;
  margin-top: 200px;
  position: absolute;
  z-index: 2;
  box-shadow: 0px 4px 8px -6px #111;
}
.wfc-hair {
  width: 70px;
  height: 70px;
  position: absolute;
  margin-top: 208px;
  margin-left: 772px;
}
.wfc-hair::before {
  width: 80px;
  height: 70px;
  position: absolute;
  content: "";
  top: 0;
  left: 0;
  background: inherit;
  transform: rotateZ(26deg);
}
.wfc-hair::after {
  width: 72px;
  height: 70px;
  position: absolute;
  content: "";
  top: 0;
  left: 0;
  background: inherit;
  transform: rotateZ(60deg);
}
.wfc-ear {
  width: 80px;
  height: 100px;
  border-radius: 80% 0 55% 50% / 55% 0 80% 50%;
  position: absolute;
  z-index: 1;
}
.wfc-ear-l {
  transform: rotateZ(-45deg);
  margin-left: 717px;
  margin-top: 173px;
}
.wfc-ear-r {
  transform: rotateZ(20deg);
  margin-left: 820px;
  margin-top: 175px;
}
.wfc-inner-ear {
  width: 60px;
  height: 100px;
  border-radius: 80% 0 55% 50% / 55% 0 80% 50%;
  background: #CC8888;
  z-index: 1;
}
.wfc-inner-ear-l { margin-left: 12px; margin-top: 6px; }
.wfc-inner-ear-r { margin-left: 10px; margin-top: 6px; }
.wfc-eye {
  width: 62px;
  height: 50px;
  border-radius: 60%;
  background-color: #E6E6E6;
  z-index: 3;
  position: absolute;
  margin-top: 32px;
}
.wfc-eye-l { margin-left: 17px; }
.wfc-eye-r { margin-left: 93px; }
.wfc-lid {
  height: 60%;
  width: 100%;
  position: absolute;
  z-index: 10;
  margin-top: -5%;
  border-radius: 100% 100% 10% 10%;
  animation: wfc-blink 6s infinite ease-in-out;
  animation-delay: 7s;
}
@keyframes wfc-blink {
  1%   { height: 60%; }
  2%   { height: 80%; }
  3%   { height: 100%; }
  4%   { height: 80%; }
  5%   { height: 60%; }
  100% { height: 60%; }
}
.wfc-pupil {
  width: 20px;
  height: 35px;
  background-color: #222;
  border-radius: 50%;
  margin-left: 20px;
  z-index: 5;
  margin-top: 3px;
}
.wfc-body {
  width: 185px;
  height: 110px;
  border-radius: 50% / 80% 80% 50% 50%;
  position: absolute;
  margin-left: 712px;
  margin-top: 276px;
  z-index: 1;
}
.wfc-foot {
  height: 28%;
  width: 30%;
  position: absolute;
  z-index: 10;
  margin-top: 43%;
  border-radius: 100% 100% 70% 70%;
  box-shadow: -2px -4px 10px -6px rgba(0,0,0,0.9);
}
.wfc-foot-l {
  margin-left: 8%;
  animation: wfc-step 9s infinite ease-in-out;
  animation-delay: 7.4s;
}
.wfc-foot-r {
  margin-left: 60%;
  animation: wfc-step 9s infinite ease-in-out;
  animation-delay: 8s;
}
@keyframes wfc-step {
  1% { transform: translateY(-1px); }
  2% { transform: translateY(-2px); }
  3% { transform: translateY(-3px); }
  4% { transform: translateY(-2px); }
  5% { transform: translateY(-1px); }
  6% { transform: translateY(0px); }
  100% { transform: translateY(0px); }
}
.wfc-tail {
  position: absolute;
  margin-left: 870px;
  margin-top: 352px;
}
.wfc-tail span {
  position: absolute;
  width: 30px;
  height: 30px;
  border-radius: 50px;
  animation: wfc-tail-wave 3s infinite ease-in-out;
}
.wfc-tail span:nth-child(2)  { left: 5px;  animation-delay: 0.2s; }
.wfc-tail span:nth-child(3)  { left: 10px; animation-delay: 0.4s; }
.wfc-tail span:nth-child(4)  { left: 15px; animation-delay: 0.6s; }
.wfc-tail span:nth-child(5)  { left: 20px; animation-delay: 0.8s; }
.wfc-tail span:nth-child(6)  { left: 25px; animation-delay: 1s;   }
.wfc-tail span:nth-child(7)  { left: 30px; animation-delay: 1.2s; }
.wfc-tail span:nth-child(8)  { left: 35px; animation-delay: 1.4s; }
.wfc-tail span:nth-child(9)  { left: 40px; animation-delay: 1.6s; }
.wfc-tail span:nth-child(10) { left: 45px; animation-delay: 1.8s; }
.wfc-tail span:nth-child(11) { left: 50px; animation-delay: 2s;   }
.wfc-tail span:nth-child(12) { left: 55px; animation-delay: 2.2s; }
.wfc-tail span:nth-child(13) { left: 60px; animation-delay: 2.4s; }
.wfc-tail span:nth-child(14) { left: 65px; animation-delay: 2.6s; }
.wfc-tail span:nth-child(15) { left: 70px; animation-delay: 2.8s; }
@keyframes wfc-tail-wave {
  0%   { transform: translateY(0px); }
  50%  { transform: translateY(-6px); }
  100% { transform: translateY(0px); }
}
@media (prefers-reduced-motion: reduce) {
  .wfc-lid, .wfc-foot-l, .wfc-foot-r, .wfc-tail span { animation: none; }
}
`;

export function CatMascot() {
  const [msgIdx, setMsgIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [bubbleKey, setBubbleKey] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setMsgIdx((i) => (i + 1) % MESSAGES.length);
      setBubbleKey((k) => k + 1);
    }, 6000);
    return () => clearInterval(t);
  }, []);

  function nextMsg() {
    setMsgIdx((i) => (i + 1) % MESSAGES.length);
    setBubbleKey((k) => k + 1);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-5 z-50 flex flex-col items-end gap-2 print:hidden">
      {/* Scoped cat styles */}
      <style dangerouslySetInnerHTML={{ __html: CAT_CSS }} />

      {/* Speech bubble */}
      <div
        key={bubbleKey}
        className="animate-fade-in relative max-w-[200px] rounded-2xl rounded-br-sm border bg-card px-3.5 py-2.5 text-xs shadow-md"
      >
        <span
          className="absolute -bottom-2 right-3 h-0 w-0 border-x-8 border-t-8 border-x-transparent border-t-card"
          aria-hidden
        />
        {MESSAGES[msgIdx]}
        <button
          onClick={(e) => { e.stopPropagation(); nextMsg(); }}
          aria-label="Next message"
          className="ml-1 inline-block align-middle text-muted-foreground hover:text-foreground"
        >
          ›
        </button>
      </div>

      {/* Cat + close row */}
      <div className="flex items-end gap-1">
        <button
          onClick={() => setVisible(false)}
          aria-label="Dismiss cat"
          className="mb-1 rounded-full border bg-card p-0.5 text-muted-foreground opacity-60 shadow transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-3 w-3" aria-hidden />
        </button>

        <button
          onClick={nextMsg}
          aria-label="Cat mascot – click for next tip"
          className="wf-bob select-none transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
        >
          <div className="wfc-wrap">
            <div className="wfc-container">
              <div className="wfc-head wfc-color">
                <div className="wfc-eye-l wfc-eye">
                  <div className="wfc-lid wfc-color" />
                  <div className="wfc-pupil" />
                </div>
                <div className="wfc-eye-r wfc-eye">
                  <div className="wfc-lid wfc-color" />
                  <div className="wfc-pupil" />
                </div>
              </div>
              <div className="wfc-ear-l wfc-ear wfc-color">
                <div className="wfc-inner-ear-l wfc-inner-ear" />
              </div>
              <div className="wfc-ear-r wfc-ear wfc-color">
                <div className="wfc-inner-ear-r wfc-inner-ear" />
              </div>
              <div className="wfc-hair wfc-color" />
              <div className="wfc-body wfc-color">
                <div className="wfc-foot wfc-foot-l wfc-color" />
                <div className="wfc-foot wfc-foot-r wfc-color" />
              </div>
              <div className="wfc-tail">
                {Array.from({ length: 15 }).map((_, i) => (
                  <span key={i} className="wfc-color" />
                ))}
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
