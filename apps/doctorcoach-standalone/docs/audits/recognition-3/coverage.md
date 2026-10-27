# Exercise Recognition 3.0 alias coverage

Counts exclude canonical names/ID and deduplicate using the production normalizer. Literal listed word-order variants count when their normalized strings differ; runtime permutations are not generated or added to this count. The separate token-distinct count also collapses word order and excludes canonical token equivalents. Alias collisions count as naming coverage, not automatic recognition. See JSON for collisions and literal diagnostics.

| ID | English | Literal normalized aliases | Token-distinct aliases | Target |
|---|---|---:|---:|---|
| wall-slide | Wall slide | 16 | 16 | 15+ |
| band-er | Band external rotation | 17 | 15 | 15+ |
| landmine | Landmine press | 17 | 16 | 15+ |
| chest-row | Chest supported row | 17 | 16 | 15+ |
| bench | Dumbbell bench press | 27 | 24 | 15+ |
| goblet | Goblet squat | 16 | 15 | 15+ |
| sit-stand | Sit to stand | 16 | 16 | 15+ |
| step-up | Low step up | 15 | 14 | 15+ |
| rdl | Romanian deadlift | 18 | 18 | 15+ |
| bird-dog | Bird dog | 18 | 18 | 15+ |
| dead-bug | Dead bug | 17 | 17 | 15+ |
| hip-bridge | Glute bridge | 15 | 15 | 15+ |
| split-squat | Split squat | 17 | 17 | 15+ |
| ecc-calf | Calf raise | 16 | 16 | 15+ |
| balance | Single leg balance | 17 | 17 | 15+ |
| wrist-ext | Wrist extension | 15 | 15 | 15+ |
| hammer-curl | Hammer curl | 20 | 19 | 15+ |
| walk | Graded walking | 16 | 16 | 15+ |
| barbell-bench | Barbell Bench Press | 25 | 24 | 15+ |
| incline-db | Incline Dumbbell Press | 18 | 17 | 15+ |
| chest-fly | Machine Chest Fly | 26 | 24 | 15+ |
| db-fly | Dumbbell Chest Fly | 17 | 17 | 15+ |
| lat-pulldown | Lat Pulldown | 24 | 24 | 15+ |
| pullup | Pull-Up | 19 | 19 | 15+ |
| chinup | Chin-Up | 18 | 18 | 15+ |
| wide-row | Wide-Grip Machine Row | 17 | 13 | 15+ |
| barbell-row | Barbell Row | 19 | 18 | 15+ |
| cable-row | Seated Cable Row | 20 | 19 | 15+ |
| overhead-press | Overhead Press | 21 | 21 | 15+ |
| lateral-raise | Dumbbell Lateral Raise | 16 | 15 | 15+ |
| rear-delt | Reverse Fly | 18 | 18 | 15+ |
| face-pull | Face Pull | 20 | 20 | 15+ |
| cable-er | Cable External Rotation | 17 | 16 | 15+ |
| serratus-punch | Serratus Punch | 17 | 15 | 15+ |
| barbell-curl | Barbell Curl | 19 | 19 | 15+ |
| cable-curl | Cable Curl | 18 | 18 | 15+ |
| triceps-pushdown | Triceps Pushdown | 22 | 22 | 15+ |
| overhead-triceps | Overhead Triceps Extension | 18 | 17 | 15+ |
| wrist-curl | Wrist Curl | 16 | 16 | 15+ |
| farmer-carry | Farmer Carry | 17 | 17 | 15+ |
| back-squat | Barbell Back Squat | 18 | 18 | 15+ |
| leg-press | Leg Press | 19 | 18 | 15+ |
| leg-extension | Leg Extension | 22 | 21 | 15+ |
| seated-curl | Seated Leg Curl | 20 | 19 | 15+ |
| lying-curl | Lying Leg Curl | 24 | 22 | 15+ |
| hip-thrust | Hip Thrust | 21 | 20 | 15+ |
| cable-kickback | Cable Glute Kickback | 17 | 17 | 15+ |
| adduction | Hip Adduction Machine | 23 | 20 | 15+ |
| standing-calf | Standing Calf Raise | 17 | 15 | 15+ |
| seated-calf | Seated Calf Raise | 17 | 17 | 15+ |
| deadlift | Conventional Deadlift | 19 | 18 | 15+ |
| paused-bench | Paused Bench Press | 16 | 14 | 15+ |
| paused-squat | Paused Back Squat | 17 | 16 | 15+ |
| crunch | Crunch | 17 | 16 | 15+ |
| plank | Plank | 17 | 17 | 15+ |
| side-plank | Side Plank | 18 | 18 | 15+ |
| hanging-knee | Hanging Knee Raise | 15 | 14 | 15+ |
| woodchop | Cable Woodchop | 16 | 16 | 15+ |
| pallof | Pallof Press | 17 | 15 | 15+ |
| shrug | Dumbbell Shrug | 15 | 15 | 15+ |
| back-extension | Back Extension | 22 | 21 | 15+ |
| cable-abduction | Standing Cable Hip Abduction | 18 | 15 | 15+ |
| side-abduction | Side-Lying Hip Abduction | 16 | 16 | 15+ |
| push-up | Push-Up | 20 | 19 | 15+ |
| machine-chest-press | Machine Chest Press | 18 | 16 | 15+ |
| cable-fly | Cable Fly | 23 | 23 | 15+ |
| incline-barbell-bench | Incline Barbell Bench Press | 17 | 16 | 15+ |
| single-arm-db-row | Single-Arm Dumbbell Row | 18 | 18 | 15+ |
| t-bar-row | T-Bar Row | 19 | 19 | 15+ |
| straight-arm-pulldown | Straight-Arm Pulldown | 19 | 19 | 15+ |
| assisted-pull-up | Assisted Pull-Up | 19 | 17 | 15+ |
| seated-db-shoulder-press | Seated Dumbbell Shoulder Press | 15 | 14 | 15+ |
| cable-lateral-raise | Cable Lateral Raise | 18 | 18 | 15+ |
| reverse-pec-deck | Reverse Pec Deck | 20 | 20 | 15+ |
| dumbbell-curl | Dumbbell Curl | 19 | 19 | 15+ |
| incline-db-curl | Incline Dumbbell Curl | 16 | 16 | 15+ |
| preacher-curl | Preacher Curl | 22 | 21 | 15+ |
| skull-crusher | Skull Crusher | 23 | 22 | 15+ |
| cable-overhead-triceps | Cable Overhead Triceps Extension | 19 | 16 | 15+ |
| close-grip-bench | Close-Grip Bench Press | 17 | 17 | 15+ |
| bulgarian-split-squat | Bulgarian Split Squat | 19 | 19 | 15+ |
| hack-squat | Hack Squat | 18 | 13 | 15+ |
| smith-squat | Smith Machine Squat | 19 | 17 | 15+ |
| reverse-lunge | Reverse Lunge | 18 | 18 | 15+ |
| walking-lunge | Walking Lunge | 18 | 18 | 15+ |
| hip-abduction-machine | Hip Abduction Machine | 19 | 18 | 15+ |
| trap-bar-deadlift | Trap-Bar Deadlift | 22 | 20 | 15+ |
| sumo-deadlift | Sumo Deadlift | 18 | 13 | 15+ |
| cable-crunch | Cable Crunch | 21 | 21 | 15+ |
| ab-wheel | Ab Wheel Rollout | 18 | 18 | 15+ |
| hanging-leg-raise | Hanging Leg Raise | 16 | 15 | 15+ |
| suitcase-carry | Suitcase Carry | 19 | 19 | 15+ |
| side-lying-external-rotation | Side-Lying External Rotation | 17 | 14 | 15+ |
| scaption | Scaption | 18 | 18 | 15+ |
| push-up-plus | Push-Up Plus | 16 | 16 | 15+ |
| chin-tuck | Chin Tuck | 20 | 20 | 15+ |
| deep-neck-flexor-hold | Deep Neck Flexor Hold | 18 | 18 | 15+ |
| cervical-isometric-rotation | Cervical Isometric Rotation | 17 | 15 | 15+ |
| thoracic-extension-bench | Thoracic Extension on Bench | 17 | 16 | 15+ |
| wrist-extension-eccentric | Eccentric Wrist Extension | 17 | 16 | 15+ |
| wrist-flexion-eccentric | Eccentric Wrist Flexion | 17 | 16 | 15+ |
| forearm-pronation-band | Band Pronation | 16 | 15 | 15+ |
| forearm-supination-band | Band Supination | 16 | 15 | 15+ |
| grip-isometric | Grip Isometric | 17 | 17 | 15+ |
| finger-extension-band | Finger Extension Band | 16 | 16 | 15+ |
| mcgill-curl-up | McGill Curl-Up | 16 | 13 | 15+ |
| hip-hinge-dowel | Hip Hinge with Dowel | 17 | 16 | 15+ |
| roman-chair-ql-lateral-stretch | Roman Chair QL Lateral Stretch | 17 | 15 | 15+ |
| single-leg-glute-bridge | Single-Leg Glute Bridge | 17 | 17 | 15+ |
| clamshell | Clamshell | 17 | 17 | 15+ |
| cossack-squat-stretch | Cossack Squat Stretch | 17 | 16 | 15+ |
| adductor-squeeze | Adductor Squeeze | 19 | 18 | 15+ |
| copenhagen-short-lever | Copenhagen Short Lever | 18 | 16 | 15+ |
| copenhagen-long-lever | Copenhagen Long Lever | 18 | 16 | 15+ |
| step-down | Step Down | 15 | 15 | 15+ |
| wall-sit | Wall Sit | 17 | 16 | 15+ |
| leg-extension-isometric | Leg Extension Isometric | 16 | 14 | 15+ |
| spanish-squat | Spanish Squat | 15 | 13 | 15+ |
| hamstring-bridge | Hamstring Bridge | 16 | 16 | 15+ |
| nordic-hamstring | Nordic Hamstring | 16 | 16 | 15+ |
| single-leg-rdl | Single-Leg RDL | 18 | 17 | 15+ |
| tibialis-raise | Tibialis Raise | 16 | 16 | 15+ |
| ankle-inversion-band | Band Ankle Inversion | 17 | 16 | 15+ |
| ankle-eversion-band | Band Ankle Eversion | 17 | 16 | 15+ |
| short-foot | Short Foot | 16 | 16 | 15+ |
| toe-yoga | Toe Yoga | 15 | 15 | 15+ |
| front-squat | Front Squat | 16 | 15 | 15+ |
| stretch-upper-trapezius-standing | Standing Upper Trapezius Stretch | 17 | 15 | 15+ |
| stretch-levator-scapulae | Levator Scapulae Stretch | 16 | 15 | 15+ |
| stretch-posterior-neck | Posterior Neck Stretch | 17 | 15 | 15+ |
| stretch-doorway-chest | Doorway Chest Stretch | 17 | 17 | 15+ |
| stretch-supine-y-chest | Supine Y Chest Stretch | 17 | 17 | 15+ |
| stretch-anterior-deltoid-wall | Wall Anterior Deltoid Stretch | 17 | 14 | 15+ |
| stretch-posterior-shoulder-cross-body | Cross-Body Posterior Shoulder Stretch | 16 | 15 | 15+ |
| stretch-upper-back-pole | Pole-Supported Upper Back Stretch | 17 | 15 | 15+ |
| stretch-lat-pole-single-arm | Single-Arm Pole Lat Stretch | 17 | 16 | 15+ |
| stretch-overhead-triceps | Overhead Triceps Stretch | 17 | 16 | 15+ |
| stretch-biceps-wall | Wall Biceps Stretch | 17 | 14 | 15+ |
| stretch-wrist-flexor-straight-elbow | Straight-Elbow Wrist Flexor Stretch | 17 | 14 | 15+ |
| stretch-wrist-extensor-straight-elbow | Straight-Elbow Wrist Extensor Stretch | 17 | 14 | 15+ |
| stretch-ql-standing-side | Standing Overhead QL Side Stretch | 17 | 15 | 15+ |
| stretch-double-knee-to-chest | Double Knee-to-Chest Stretch | 17 | 17 | 15+ |
| stretch-childs-pose | Child’s Pose | 18 | 18 | 15+ |
| stretch-low-cobra | Low Cobra Stretch | 17 | 17 | 15+ |
| stretch-hip-flexor-half-kneeling | Half-Kneeling Hip Flexor Stretch | 16 | 14 | 15+ |
| stretch-modified-thomas | Modified Thomas Stretch | 17 | 16 | 15+ |
| stretch-quadriceps-standing | Supported Standing Quadriceps Stretch | 17 | 16 | 15+ |
| stretch-rectus-femoris-half-kneeling | Half-Kneeling Rectus Femoris Stretch | 17 | 15 | 15+ |
| stretch-couch | Couch Stretch | 17 | 17 | 15+ |
| stretch-hamstring-step | Heel-on-Step Hamstring Stretch | 17 | 15 | 15+ |
| stretch-glute-knee-opposite-shoulder | Knee-to-Opposite-Shoulder Stretch | 17 | 15 | 15+ |
| stretch-adductor-butterfly | Seated Butterfly Adductor Stretch | 17 | 13 | 15+ |
| stretch-adductor-lateral-lunge | Standing Lateral-Lunge Adductor Stretch | 17 | 13 | 15+ |
| stretch-lateral-hip-cross-legged | Cross-Legged Lateral Hip Stretch | 17 | 15 | 15+ |
| stretch-lateral-hip-wall | Wall-Supported Lateral Hip Stretch | 16 | 16 | 15+ |
| stretch-calf-wall-straight-knee | Straight-Knee Wall Calf Stretch | 17 | 12 | 15+ |
| stretch-soleus-wall-bent-knee | Bent-Knee Wall Soleus Stretch | 17 | 13 | 15+ |
| movement-squat | Squat | 15 | 15 | 15+ |
| movement-chest-press | Chest Press | 15 | 15 | 15+ |
| movement-leg-curl | Leg Curl | 15 | 15 | 15+ |
| movement-calf-raise | Calf Raise | 15 | 15 | 15+ |
| movement-shrug | Shrug | 15 | 15 | 15+ |
| movement-pullover | Pullover | 15 | 15 | 15+ |
| movement-upright-row | Upright Row | 15 | 15 | 15+ |
| movement-overhead-press | Overhead Press | 15 | 15 | 15+ |
| movement-bent-over-row | Bent Over Row | 15 | 15 | 15+ |
| movement-lateral-raise | Lateral Raise | 15 | 15 | 15+ |
| movement-rear-delt-fly | Rear Delt Fly | 15 | 15 | 15+ |
| movement-rear-delt-row | Rear Delt Row | 15 | 15 | 15+ |
| movement-side-crunch | Side Crunch | 15 | 15 | 15+ |
| movement-kelso-shrug | Kelso Shrug | 16 | 14 | 15+ |
| movement-hammer-pulldown-narrow | Narrow Grip Hammer Pulldown | 17 | 16 | 15+ |
| movement-hammer-row-wide | Wide Grip Hammer Row | 18 | 15 | 15+ |
| seated-leg-press | Seated Leg Press | 17 | 15 | 15+ |
| incline-machine-chest-press | Incline Machine Chest Press | 19 | 16 | 15+ |
| machine-lateral-raise | Machine Lateral Raise | 21 | 19 | 15+ |
| machine-biceps-curl | Machine Biceps Curl | 21 | 17 | 15+ |
| cable-straight-leg-hip-flexion | Straight-Leg Cable Hip Flexion | 16 | 15 | 15+ |
| parallel-bar-dip | Parallel-Bar Dip | 20 | 20 | 15+ |
| wide-grip-cable-pulldown | Wide-Grip Cable Lat Pulldown | 18 | 17 | 15+ |
| narrow-grip-cable-pulldown | Narrow-Grip Cable Lat Pulldown | 19 | 18 | 15+ |
| movement-wide-grip-pulldown | Wide-Grip Pulldown | 16 | 16 | 15+ |
| movement-narrow-grip-pulldown | Narrow-Grip Pulldown | 16 | 16 | 15+ |
