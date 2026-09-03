window.STICK_STORY = {
  title: 'The Last Good Line',
  premise: 'A forgotten sketchbook is erasing itself. You are Line — a tiny hero once drawn for a game that was never finished. Years after the Artist closed the book, the discarded ideas inside it learned how to move.',
  prologue: {
    title: 'How to Draw a Hero',
    objective: 'Wake up on the First Page.',
    panels: [
      {visual:'blank', caption:'Before the monsters, before the sword, before the Erasing, there was a cheap sketchbook and an Artist with a game idea.', speaker:'MARGIN'},
      {visual:'pencil', caption:'The Artist started with the smallest possible hero: a circle, a spine, two arms, two legs.', speaker:'ARTIST', speech:'Okay. Tiny hero test.'},
      {visual:'creation', caption:'They redrew the little figure until it looked almost ready to move.', speaker:'ARTIST', speech:'You need a name... Line.'},
      {visual:'sword', caption:'Line was sketched swinging a sword against enemies that barely had faces.', speaker:'ARTIST', speech:'One little guy versus way too many monsters.'},
      {visual:'shield', caption:'Then came a shield, blocking poses, hurt poses, victories, failures, and pages of unfinished animation ideas.', speaker:'MARGIN'},
      {visual:'notes', caption:'In the margin the Artist left a promise in heavy pencil: FINISH THIS SOMEDAY.', speaker:'MARGIN'},
      {visual:'abandoned', caption:'Someday never arrived. The sketchbook closed. The prototype game stayed a prototype.', speaker:'MARGIN'},
      {visual:'discarded', caption:'Years passed. Crossed-out monsters, rejected heroes and erased ideas remained trapped between the pages.', speaker:'THE BACK COVER', speech:'UNFINISHED DOES NOT MEAN DEAD.'},
      {visual:'awaken', caption:'A drop of old red ink reached Line. For the first time, the drawing moved without the Artist’s hand.', speaker:'MARGIN', speech:'Line? If you can read this... move.'}
    ]
  },
  chapters: [
    {
      number: 1,
      name: 'The First Page',
      subtitle: 'A hero learns what the Artist gave him — and what the Artist left behind.',
      theme: 0,
      beats: [
        {
          title: 'A Line That Should Not Move',
          visual: 'awaken', speaker:'MARGIN',
          text:['The first page trembles beneath your feet. The sword the Artist drew years ago is still in your hand.','A sentence writes itself beside you: “I am the Margin. I was supposed to be notes for later.”','Red scratches gather at the edge of the page. Later has finally arrived.'],
          objective:'Learn to move and swing. Clear the first wave.', encounter:'battle',
          tutorial:['Move with WASD or the arrow keys.','Aim with the mouse.','Left click or press Space to swing.']
        },
        {
          title: 'The Shield Beside You', speaker:'MARGIN', visual:'shield',
          text:['When the red thing breaks apart, an old board shield slides out from beneath an erased drawing.','You remember nothing, but the page does: the Artist drew this shield only a few minutes after drawing you.','“He wanted you to survive long enough to be fun,” the Margin writes. “Try not to ruin that.”'],
          objective:'Learn to block frontal attacks.', encounter:'battle',
          tutorial:['Hold Right Click to raise your shield.','You cannot swing while blocking.','Blocking only works against attacks coming from in front of you.']
        },
        {
          title: 'Nib Was a Joke', speaker:'NIB', visual:'shop',
          text:['A tiny stickman unfolds himself from a price doodle in the margin. His paper hat still has “SHOP GUY??” written through it.','“Name’s Nib. I was drawn as a joke and then accidentally survived for six years.”','The Margin writes: “He is unbearable. His upgrades are real.”'],
          objective:'Visit Nib, understand the shop, then survive the next page.', encounter:'battle', openShopBefore:true,
          tutorial:['Stats are reliable number upgrades.','Perks add new mechanics.','Swords, shields, and clothes change your playstyle and have their own upgrade paths.']
        },
        {
          title: 'The Book Learns Back', speaker:'MARGIN', visual:'dash',
          text:['The enemies stop walking straight at you. They circle. They hesitate. They lunge when you commit to a swing.','“They are not becoming smarter,” the Margin writes. “They are remembering all the versions the Artist crossed out.”'],
          objective:'Survive a harder wave and learn to dash.', encounter:'elite',
          tutorial:['Press Shift to dash.','Dashing gives a brief moment of safety.','Use movement, blocking, and attacking together.']
        },
        {
          title: 'Boss: The Scribbled Brute',
          visual: 'brute', speaker:'THE BRUTE',
          text:['Something enormous tears through an old erased boss sketch. Its outline has been redrawn so many times the paper underneath is nearly black.','Above it, the Artist once wrote: “TOO UGLY. REDO.”','The Brute scratches out the words with one hand and points at you with the other.'],
          objective:'Defeat the Scribbled Brute.', encounter:'boss'
        }
      ],
      outro:{speaker:'MARGIN',title:'The Door Under the Ink',visual:'door',text:['When the Brute falls, a doorway appears beneath the red ink.','Beyond it are pages the Artist tried much harder to erase.','“You were not the only hero drawn in this book,” the Margin writes. “You were just the last one he did not cross out.”']}
    },
    {
      number: 2,
      name: 'Red Ink',
      subtitle: 'The discarded villain remembers exactly why she was erased.',
      theme: 1,
      beats: [
        {title:'The Red Court',visual:'court',speaker:'NIB',text:['Nib is already waiting on the next page. Somehow.','Rows of red figures kneel toward a crown sketched at the top of the paper.','“The Queen was supposed to be the villain,” Nib says. “Then the Artist decided she was trying too hard. She took that personally.”'],objective:'Break through the Red Court.',encounter:'battle'},
        {title:'Ink That Shoots Back',visual:'projectile',speaker:'MARGIN',text:['The next drawings refuse to come close. Their mouths fill with red ink.','The Margin underlines your shield twice: “The Artist gave you defensive frames. Use them.”'],objective:'Defeat ranged enemies. Experiment with blocking projectiles.',encounter:'battle',tutorial:['Projectiles disappear when safely blocked.','Mirror-type shields can reflect projectiles.','Perfectly timed blocks can trigger special effects.']},
        {title:'Props From Dead Ideas',speaker:'NIB',visual:'relic',text:['Nib opens a drawer that could not possibly fit inside his coat.','Inside are props from abandoned mechanics: a broken clock, an eraser, a bent coin, a battery with no machine.','“Relics,” he says. “When a mechanic dies, sometimes the weirdest part survives.”'],objective:'Earn your first relic.',encounter:'elite',guaranteeRelic:true},
        {title:'The Queen Notices',visual:'queen',speaker:'INK QUEEN',text:['A sentence appears in red across the whole page: “YOU ARE THE FAVORITE DRAFT.”','The Margin replies: “He was the unfinished draft.”','The Queen’s crown bends. “SAME THING.”'],objective:'Reach the throne page.',encounter:'elite'},
        {title:'Boss: The Ink Queen',visual:'queenboss',speaker:'INK QUEEN',text:['A crown forms first. Then a body. Then an orbit of droplets sharp enough to puncture paper.','“I had dialogue. A throne. Three phases. He erased me because I was ‘too much.’”','She smiles. “So I became more.”'],objective:'Defeat the Ink Queen.',encounter:'boss'}
      ],
      outro:{visual:'queenfall',speaker:'INK QUEEN',title:'Not the Enemy She Wanted to Be',text:['The Queen breaks apart, but her crown remains.','“The Back Cover does not want revenge,” she whispers. “It wants there to have never been a book.”','The Margin writes beneath her fading words: “Then we are all on the same side. Unfortunately.”']}
    },
    {
      number: 3,
      name: 'Burnt Pages',
      subtitle: 'Line meets the hero who existed before him.',
      theme: 2,
      beats: [
        {title:'Ash in the Fold',visual:'ash',speaker:'MARGIN',text:['The paper ahead is burnt at the edges. Some drawings end halfway through their own bodies.','“This is where the Artist stopped trying to erase things neatly,” the Margin writes.','A sword-shaped silhouette watches from the page edge.'],objective:'Cross the burnt page.',encounter:'battle'},
        {title:'The Forge Page',visual:'forge',speaker:'NIB',text:['A hammer appears. Then an anvil. Then Nib, covered in soot he definitely drew onto himself.','“The Artist planned weapon evolution here. Never coded it. Rude.”','He lifts the hammer. “We can improvise.”'],objective:'Use a Forge reward, then survive.',encounter:'battle',forgeBefore:true,tutorial:['Forge nodes improve one piece of equipped gear for free.','Each weapon and shield has its own upgrade path.','Commit to a build instead of buying everything.']},
        {title:'The First Hero',speaker:'MARGIN KNIGHT',visual:'knight',text:['The armored stickman steps out of the margin. His proportions are almost yours. His sword is almost yours.','“You think you were the first?” he says. Unlike the Margin, his words make sound.','Behind him, half-erased notes read: “HERO V1 — TOO COMPLICATED.”'],objective:'Survive the old hero’s scouts.',encounter:'elite'},
        {title:'What the Margin Is',visual:'notes',speaker:'MARGIN',text:['“I was the Artist’s notes,” the Margin admits. “Fix sword. Add boss. Make hero simpler. Maybe finish someday.”','The Knight was the first hero. Too many animations. Too many systems. You were the replacement: one clean line the Artist thought he could actually finish.','“Then he abandoned both of you.”'],objective:'Reach the Margin Knight.',encounter:'battle'},
        {title:'Boss: The Margin Knight',visual:'duel',speaker:'MARGIN KNIGHT',text:['The Knight raises his blade.','“I spent years believing you replaced me because you were better.”','He lowers into the same fighting stance the Artist eventually gave you. “Prove I was wrong for the right reason.”'],objective:'Defeat the Margin Knight.',encounter:'boss'}
      ],
      outro:{visual:'knightfall',speaker:'MARGIN KNIGHT',title:'Two Good Lines',text:['The Knight drops his sword, but does not disappear.','“You did not replace me,” he says. “The Artist stopped choosing.”','He points toward the final intact page. “Go make the choice for him.”']}
    },
    {
      number: 4,
      name: 'The Back Cover',
      subtitle: 'Every crossed-out idea has become one final thing.',
      theme: 3,
      beats: [
        {title:'No More Margins',visual:'cover',speaker:'MARGIN',text:['There are no page numbers here. No doodles. No empty corners.','Only a black seam running through the paper like a closed mouth.','“I cannot write past this point,” the Margin says. “The Artist never left notes here.”'],objective:'Enter the Back Cover.',encounter:'battle'},
        {title:'Discarded Things',visual:'discarded',speaker:'THE BACK COVER',text:['Old enemy shapes crawl out stitched together: rejected limbs, unused weapons, boss attacks that never had bosses.','A voice comes from everywhere: “HE KEPT ONE LINE. HE THREW AWAY A WORLD.”'],objective:'Survive the discarded swarm.',encounter:'elite'},
        {title:'The Last Shop',visual:'lastshop',speaker:'NIB',text:['Nib appears one final time. His paper hat is gone.','“No joke this time,” he says. “Spend everything. Gold probably does not exist outside a notebook.”','He pauses. “If it does, I am going to be furious.”'],objective:'Prepare your final build.',encounter:'battle',openShopBefore:true},
        {title:'The Last Good Line',visual:'lastline',speaker:'MARGIN',text:['One final sentence writes itself beneath your feet.','“You were never the best drawing.”','A second sentence follows. “You were simply the one still willing to move.”'],objective:'Reach the Back Cover.',encounter:'elite'},
        {title:'Final Boss: The Back Cover',visual:'finalboss',speaker:'THE BACK COVER',text:['The seam opens. Every abandoned monster, weapon, note, and crossed-out idea moves behind it at once.','“YOU ARE ONLY A LINE.”','For once, nobody writes an answer for you.'],objective:'Defeat the Back Cover.',encounter:'boss',final:true}
      ],
      outro:{visual:'ending',speaker:'LINE',title:'The Ending You Draw Yourself',text:['The Back Cover tears open — and Line does not erase what is inside. He draws a border around it.','The discarded ideas stop fighting for space. The surviving pages settle.','The Margin returns one letter at a time: “Still there?”','Line drags Scrapsteel through the paper and draws one short line beneath the question. Yes.','In the corner, where the Artist once wrote “maybe finish someday,” the Margin adds one word: “Ongoing.”']}
    }
  ]
};
