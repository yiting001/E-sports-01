<script setup lang="ts">
import { Trophy } from '@element-plus/icons-vue';
import { useBrandingStore } from '@/stores/branding.store';
import './AuthHeroPanel.css';

const branding = useBrandingStore();
</script>

<template>
  <aside class="auth-hero">
    <div class="hero-inner">
      <div class="brand-line">
        <span class="brand-mark">
          <img
            v-if="branding.appLogo"
            :src="branding.appLogo"
            class="brand-logo"
            alt="logo"
          >
          <el-icon v-else><Trophy /></el-icon>
        </span>
        <span>{{ branding.appName }}</span>
      </div>

      <section class="hero-copy">
        <p>Enterprise Operations</p>
        <h1>统一运营入口</h1>
        <span>聚合赛事、权限、消息与内容管理能力，适配电竞业务和通用运营场景。</span>
      </section>

      <svg
        class="hero-illustration"
        viewBox="0 0 680 390"
        role="img"
        aria-label="电竞运营中心插画"
      >
        <defs>
          <linearGradient
            id="hero-stage-gradient"
            x1="90"
            x2="580"
            y1="70"
            y2="330"
            gradientUnits="userSpaceOnUse"
          >
            <stop
              offset="0"
              stop-color="#0f766e"
            />
            <stop
              offset="0.55"
              stop-color="#111827"
            />
            <stop
              offset="1"
              stop-color="#be123c"
            />
          </linearGradient>
          <linearGradient
            id="hero-glow-gradient"
            x1="120"
            x2="530"
            y1="120"
            y2="310"
            gradientUnits="userSpaceOnUse"
          >
            <stop
              offset="0"
              stop-color="#67e8f9"
            />
            <stop
              offset="1"
              stop-color="#fbbf24"
            />
          </linearGradient>
          <radialGradient
            id="hero-radar-gradient"
            cx="0.5"
            cy="0.45"
            r="0.62"
          >
            <stop
              offset="0"
              stop-color="#ffffff"
              stop-opacity="0.9"
            />
            <stop
              offset="0.45"
              stop-color="#5eead4"
              stop-opacity="0.42"
            />
            <stop
              offset="1"
              stop-color="#0f172a"
              stop-opacity="0"
            />
          </radialGradient>
          <filter
            id="hero-soft-shadow"
            x="-20%"
            y="-20%"
            width="140%"
            height="150%"
          >
            <feDropShadow
              dx="0"
              dy="18"
              stdDeviation="18"
              flood-color="#020617"
              flood-opacity="0.34"
            />
          </filter>
        </defs>

        <rect
          x="42"
          y="34"
          width="596"
          height="322"
          rx="34"
          fill="url(#hero-stage-gradient)"
          opacity="0.86"
        />
        <path
          d="M94 118C178 54 284 46 372 90C446 128 505 126 586 80"
          fill="none"
          stroke="#5eead4"
          stroke-opacity="0.24"
          stroke-width="42"
        />
        <path
          d="M79 279C178 210 284 214 366 254C458 299 526 286 610 218"
          fill="none"
          stroke="#fb7185"
          stroke-opacity="0.18"
          stroke-width="38"
        />

        <g
          opacity="0.28"
          stroke="#e2e8f0"
          stroke-width="1"
        >
          <path d="M94 84H586" />
          <path d="M94 134H586" />
          <path d="M94 184H586" />
          <path d="M94 234H586" />
          <path d="M94 284H586" />
          <path d="M140 70V320" />
          <path d="M220 70V320" />
          <path d="M300 70V320" />
          <path d="M380 70V320" />
          <path d="M460 70V320" />
          <path d="M540 70V320" />
        </g>

        <g filter="url(#hero-soft-shadow)">
          <path
            d="M130 266L230 204H450L552 266L486 318H196L130 266Z"
            fill="#020617"
            opacity="0.76"
          />
          <path
            d="M168 263L244 220H436L514 263L466 296H216L168 263Z"
            fill="#101827"
            stroke="#5eead4"
            stroke-opacity="0.35"
          />
          <path
            d="M238 220L306 181H374L442 220H238Z"
            fill="#172033"
            stroke="#fbbf24"
            stroke-opacity="0.42"
          />
        </g>

        <g class="hero-svg-accent">
          <rect
            x="258"
            y="120"
            width="164"
            height="86"
            rx="18"
            fill="#0f172a"
            stroke="#5eead4"
            stroke-opacity="0.44"
          />
          <path
            d="M286 168C314 138 363 140 394 168"
            fill="none"
            stroke="url(#hero-glow-gradient)"
            stroke-linecap="round"
            stroke-width="7"
          />
          <circle
            cx="340"
            cy="165"
            r="23"
            fill="url(#hero-radar-gradient)"
          />
          <path
            d="M340 148L354 172H326L340 148Z"
            fill="#f8fafc"
          />
        </g>

        <g>
          <rect
            x="118"
            y="152"
            width="104"
            height="82"
            rx="18"
            fill="#111827"
            stroke="#38bdf8"
            stroke-opacity="0.42"
          />
          <rect
            x="458"
            y="152"
            width="104"
            height="82"
            rx="18"
            fill="#111827"
            stroke="#fb7185"
            stroke-opacity="0.42"
          />
          <path
            d="M146 196H194"
            stroke="#67e8f9"
            stroke-linecap="round"
            stroke-width="8"
          />
          <path
            d="M486 196H534"
            stroke="#fb7185"
            stroke-linecap="round"
            stroke-width="8"
          />
          <circle
            cx="170"
            cy="179"
            r="11"
            fill="#67e8f9"
          />
          <circle
            cx="510"
            cy="179"
            r="11"
            fill="#fb7185"
          />
        </g>

        <g>
          <path
            d="M223 286C281 252 398 252 457 286"
            fill="none"
            stroke="#5eead4"
            stroke-linecap="round"
            stroke-width="6"
          />
          <path
            d="M252 305C302 281 379 281 430 305"
            fill="none"
            stroke="#fbbf24"
            stroke-linecap="round"
            stroke-width="5"
          />
          <circle
            cx="222"
            cy="286"
            r="8"
            fill="#5eead4"
          />
          <circle
            cx="458"
            cy="286"
            r="8"
            fill="#5eead4"
          />
          <circle
            cx="340"
            cy="276"
            r="7"
            fill="#fbbf24"
          />
        </g>

        <g class="hero-floating-panel">
          <rect
            x="82"
            y="78"
            width="132"
            height="48"
            rx="16"
            fill="#020617"
            fill-opacity="0.7"
            stroke="#ffffff"
            stroke-opacity="0.1"
          />
          <path
            d="M106 103H176"
            stroke="#5eead4"
            stroke-linecap="round"
            stroke-width="6"
          />
          <circle
            cx="190"
            cy="103"
            r="6"
            fill="#fbbf24"
          />
        </g>

        <g class="hero-floating-panel">
          <rect
            x="466"
            y="82"
            width="128"
            height="50"
            rx="16"
            fill="#020617"
            fill-opacity="0.7"
            stroke="#ffffff"
            stroke-opacity="0.1"
          />
          <path
            d="M492 107H544"
            stroke="#fb7185"
            stroke-linecap="round"
            stroke-width="6"
          />
          <path
            d="M556 107H572"
            stroke="#fbbf24"
            stroke-linecap="round"
            stroke-width="6"
          />
        </g>

        <text
          x="117"
          y="341"
          fill="#cbd5e1"
          font-size="13"
          font-weight="700"
        >
          LIVE OPERATIONS
        </text>
        <text
          x="458"
          y="341"
          fill="#cbd5e1"
          font-size="13"
          font-weight="700"
        >
          ACCESS CENTER
        </text>
      </svg>

      <div class="hero-tags">
        <span>赛事运营</span>
        <span>权限管控</span>
        <span>消息协同</span>
      </div>
    </div>
  </aside>
</template>
