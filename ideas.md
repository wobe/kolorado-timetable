# Kolorádó Festival Timetable — Design Ideas

<response>
<text>

## Idea 1: "Neon Grid" — Brutalist Festival Grid

**Design Movement:** Neo-Brutalism meets festival neon aesthetics

**Core Principles:**
1. Raw, unapologetic grid structure with hard edges and bold cell borders
2. High-contrast neon accents on deep dark backgrounds — the festival at night
3. Information density — every pixel serves the festival-goer scanning for their next act
4. Tactile interactivity — elements feel like physical schedule boards

**Color Philosophy:** The deep teal `#062322` serves as the infinite night sky of the festival grounds. The lime-chartreuse `#dcea75` is the neon glow of stage lights cutting through darkness. Secondary tones (muted teals, warm ambers) differentiate stages without competing with the primary palette. The emotional intent is excitement tempered by clarity.

**Layout Paradigm:** A strict time-axis grid where the Y-axis represents hours (10:00–07:00) and columns represent stages. Each artist block is a colored cell whose height maps to set duration. The grid scrolls horizontally on mobile (stages) and vertically (time). No cards, no lists — pure grid.

**Signature Elements:**
1. Glowing cell borders on hover/active states that mimic the Figma's blur glow
2. A persistent "NOW" indicator — a horizontal neon line that pulses across the current time

**Interaction Philosophy:** Direct manipulation — tap a cell to expand details and reveal the "Add to Calendar" action. Stage headers are toggle filters. Day tabs feel like physical switches.

**Animation:** Cells fade-slide in on day switch. The NOW line animates smoothly. Hover states use a subtle scale + glow transition (200ms ease-out). Page load staggers cells from top-left to bottom-right.

**Typography System:** A rounded, soft display font (Nunito or Quicksand as a web-safe stand-in for Serial Blur) for headings and artist names. A clean geometric sans (DM Sans) for times and metadata. Sizes: Day tabs 18px bold, stage headers 14px uppercase tracking-wide, artist names 15px semibold, times 12px regular.

</text>
<probability>0.08</probability>
</response>

<response>
<text>

## Idea 2: "Tape Deck" — Analog Music Player Aesthetic

**Design Movement:** Retro-analog / Skeuomorphic music hardware

**Core Principles:**
1. The timetable as a mixing console — each stage is a "channel strip"
2. Warm, textured surfaces that evoke wood panels and brushed metal
3. Circular/dial-based navigation for day selection
4. Intimate scale — feels like holding a festival program in your hands

**Color Philosophy:** Deep forest greens and warm blacks as the chassis. The `#dcea75` accent becomes the VU meter glow and indicator LEDs. Copper and cream accents for secondary elements. The mood is warm nostalgia meeting modern festival energy.

**Layout Paradigm:** Vertical channel strips side by side, each representing a stage. Time flows top-to-bottom. On mobile, swipe between channels. A "tape reel" progress indicator shows how far through the day you've scrolled.

**Signature Elements:**
1. Fader-style scroll indicators on each stage column
2. LED-dot-matrix style for the current time display

**Interaction Philosophy:** Swipe-based navigation between stages on mobile. Rotary-dial metaphor for day selection. Long-press on an artist to "record" (add to calendar). Everything has satisfying tactile feedback.

**Animation:** Channel strips slide in from bottom on load. Day transitions use a tape-rewind effect. Artist blocks have a subtle "tape wobble" entrance. Scroll triggers parallax on the background texture.

**Typography System:** A monospace display font (Space Mono) for times and technical info. A rounded humanist sans (Nunito) for artist names to keep warmth. VU meter labels in condensed uppercase. Sizes follow a modular scale based on 14px.

</text>
<probability>0.05</probability>
</response>

<response>
<text>

## Idea 3: "Forest Floor" — Organic Nature-Tech Hybrid

**Design Movement:** Organic Modernism — nature patterns meet digital interfaces

**Core Principles:**
1. Flowing, non-rectangular shapes that echo the festival's lakeside/farm setting
2. Layered depth — elements float at different z-levels like forest canopy layers
3. Color-coded stages using natural tones (moss, earth, sky, sunset)
4. Breathing whitespace that lets the schedule feel unhurried

**Color Philosophy:** The `#062322` background is the deep forest at dusk. `#dcea75` is firefly light and bioluminescence. Each stage gets a nature-derived color: moss green, warm earth, twilight blue, sunset amber. The palette shifts subtly as you move through the day — cooler tones for morning, warmer for evening, deep blues for night.

**Layout Paradigm:** A flowing timeline where time moves left-to-right. Artist blocks are rounded, organic shapes (pill/capsule) that float along their stage's "stream." Stages stack vertically like layers of terrain. On mobile, it becomes a vertical river of events.

**Signature Elements:**
1. Organic blob shapes as section dividers and decorative elements
2. A gradient sky-bar at the top that shifts color based on the selected time of day

**Interaction Philosophy:** Smooth horizontal scrolling through time. Pinch-to-zoom on desktop for detail levels. Tap an artist bubble to bloom open with details. Filters feel like parting leaves to reveal content beneath.

**Animation:** Artist bubbles float in with spring physics on day change. The sky gradient transitions smoothly. Scroll-linked parallax on background layers. Hover causes gentle "breathing" scale animation on artist blocks.

**Typography System:** Quicksand for all headings — its rounded terminals echo the organic shapes. Inter or DM Sans for body/metadata. Artist names in medium weight, times in light weight. A generous line-height (1.6) throughout for that breathing quality.

</text>
<probability>0.06</probability>
</response>
