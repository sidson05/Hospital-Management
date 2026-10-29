import React from 'react';

/**
 * BotanicalBackground renders:
 * 1. Fixed full-viewport gradient
 * 2. Three large blurred colour circles (blur 70px, opacity .75)
 * 3. Inline SVG layer of 3 olive-branch silhouettes (curved stem with ~13 ellipse leaves, fill rgba(36,73,62,.34))
 * The blur needs something to refract, so keep the branches behind the glass.
 */
export default function BotanicalBackground() {
  return (
    <div className="botanical-viewport" aria-hidden="true">
      {/* 3 blurred colour circles */}
      <div className="botanical-blob blob-1" />
      <div className="botanical-blob blob-2" />
      <div className="botanical-blob blob-3" />

      {/* Inline SVG layer of 3 olive-branch silhouettes */}
      <svg
        className="botanical-svg-branches"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <g style={{ fill: 'var(--branch-fill)' }}>
          {/* Olive Branch 1: Top Right gracefully cascading downwards */}
          <g transform="translate(1050, -40) rotate(32)">
            {/* Curved Stem */}
            <path
              d="M10 10 Q 140 180 200 440"
              stroke="var(--branch-fill)"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* 13 Leaves alternating along the curved stem */}
            <ellipse cx="40" cy="50" rx="14" ry="7" transform="rotate(-25 40 50)" />
            <ellipse cx="65" cy="80" rx="15" ry="8" transform="rotate(35 65 80)" />
            <ellipse cx="80" cy="120" rx="16" ry="8.5" transform="rotate(-30 80 120)" />
            <ellipse cx="110" cy="150" rx="17" ry="9" transform="rotate(38 110 150)" />
            <ellipse cx="125" cy="190" rx="17" ry="9" transform="rotate(-28 125 190)" />
            <ellipse cx="150" cy="225" rx="18" ry="9.5" transform="rotate(40 150 225)" />
            <ellipse cx="160" cy="265" rx="17" ry="9" transform="rotate(-25 160 265)" />
            <ellipse cx="180" cy="300" rx="16" ry="8.5" transform="rotate(35 180 300)" />
            <ellipse cx="185" cy="340" rx="15" ry="8" transform="rotate(-20 185 340)" />
            <ellipse cx="198" cy="375" rx="14" ry="7.5" transform="rotate(30 198 375)" />
            <ellipse cx="195" cy="405" rx="13" ry="7" transform="rotate(-15 195 405)" />
            <ellipse cx="202" cy="425" rx="12" ry="6.5" transform="rotate(22 202 425)" />
            {/* Terminal leaf at the tip */}
            <ellipse cx="200" cy="445" rx="12" ry="6" transform="rotate(65 200 445)" />
          </g>

          {/* Olive Branch 2: Bottom Left reaching up into the viewport */}
          <g transform="translate(180, 580) rotate(-68)">
            {/* Curved Stem */}
            <path
              d="M10 10 Q 120 160 220 420"
              stroke="var(--branch-fill)"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* 13 Leaves alternating */}
            <ellipse cx="35" cy="45" rx="14" ry="7" transform="rotate(-28 35 45)" />
            <ellipse cx="60" cy="75" rx="15" ry="8" transform="rotate(32 60 75)" />
            <ellipse cx="78" cy="115" rx="16" ry="8.5" transform="rotate(-32 78 115)" />
            <ellipse cx="105" cy="148" rx="17" ry="9" transform="rotate(36 105 148)" />
            <ellipse cx="122" cy="188" rx="17" ry="9" transform="rotate(-26 122 188)" />
            <ellipse cx="148" cy="222" rx="18" ry="9.5" transform="rotate(42 148 222)" />
            <ellipse cx="162" cy="260" rx="17" ry="9" transform="rotate(-24 162 260)" />
            <ellipse cx="182" cy="298" rx="16" ry="8.5" transform="rotate(38 182 298)" />
            <ellipse cx="192" cy="336" rx="15" ry="8" transform="rotate(-18 192 336)" />
            <ellipse cx="206" cy="370" rx="14" ry="7.5" transform="rotate(28 206 370)" />
            <ellipse cx="212" cy="398" rx="13" ry="7" transform="rotate(-12 212 398)" />
            <ellipse cx="218" cy="412" rx="12" ry="6.5" transform="rotate(20 218 412)" />
            <ellipse cx="220" cy="425" rx="12" ry="6" transform="rotate(60 220 425)" />
          </g>

          {/* Olive Branch 3: Subtle Mid-Right branch */}
          <g transform="translate(1180, 520) rotate(-140)">
            {/* Curved Stem */}
            <path
              d="M10 10 Q 110 150 190 390"
              stroke="var(--branch-fill)"
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
            />
            {/* 13 Leaves alternating */}
            <ellipse cx="32" cy="42" rx="13" ry="6.5" transform="rotate(-25 32 42)" />
            <ellipse cx="55" cy="70" rx="14" ry="7.5" transform="rotate(30 55 70)" />
            <ellipse cx="72" cy="108" rx="15" ry="8" transform="rotate(-30 72 108)" />
            <ellipse cx="98" cy="140" rx="16" ry="8.5" transform="rotate(35 98 140)" />
            <ellipse cx="115" cy="178" rx="16" ry="8.5" transform="rotate(-25 115 178)" />
            <ellipse cx="138" cy="210" rx="17" ry="9" transform="rotate(38 138 210)" />
            <ellipse cx="152" cy="245" rx="16" ry="8.5" transform="rotate(-22 152 245)" />
            <ellipse cx="168" cy="280" rx="15" ry="8" transform="rotate(34 168 280)" />
            <ellipse cx="176" cy="315" rx="14" ry="7.5" transform="rotate(-18 176 315)" />
            <ellipse cx="184" cy="345" rx="13" ry="7" transform="rotate(26 184 345)" />
            <ellipse cx="188" cy="368" rx="12" ry="6.5" transform="rotate(-12 188 368)" />
            <ellipse cx="190" cy="382" rx="11" ry="6" transform="rotate(18 190 382)" />
            <ellipse cx="190" cy="395" rx="11" ry="5.5" transform="rotate(55 190 395)" />
          </g>
        </g>
      </svg>
    </div>
  );
}
