# Buildings and ship components

Inputs are catalogue ids from `catalogue.csv`. Outputs are listed where a building makes catalogue items. Milestone numbers refer to `chain.md`.

## Production buildings

### Extraction
| building | where | main inputs | outputs | from milestone |
|---|---|---|---|---|
| mine_earth | Earth | compute | iron, nickel, cobalt, aluminium, titanium, lithium, copper, chromium, molybdenum, tungsten, niobium, neodymium, samarium, yttrium, uranium, phosphorus, potassium, fluorite, graphite | 1 |
| air_separation_plant | Earth, Mars | (air) | oxygen, nitrogen, argon, krypton, xenon, neon | 1 |
| regolith_excavator | Moon, Mars | ndfeb_magnet, li_ion_cell, ai_models | lunar_regolith, ilmenite, anorthite, martian_regolith, helium3 (heated) | 8 |
| ice_mine | Moon poles, Mars | regolith_excavator output, fission power | water | 8 |
| asteroid_miner | NEAs, main belt | ai_models, asteroidal_steel, solar_array or fission_reactor_ship | carbonaceous_chondrite, ordinary_chondrite, fe_ni_metal | 16 |
| gas_giant_scoop | Uranus, Saturn | fusion_drive, rebco, uhtc | hydrogen, helium4, helium3, deuterium | 25 |

### Processing and refining
| building | main inputs | outputs | from milestone |
|---|---|---|---|
| smelter | iron, aluminium, silicon ores; ilmenite; anorthite; carbon | iron, aluminium, titanium, silicon | 1 |
| alloy_works | iron, chromium, nickel, aluminium, lithium, copper, titanium, vanadium, molybdenum, niobium, hafnium, tungsten | stainless_steel, al_li_alloy, ti_6al_4v, nickel_superalloy, grcop, c103, haynes_230 | 1 |
| electrolysis_plant | water, platinum, ysz | hydrogen, oxygen | 3 |
| cryogenic_liquefaction_plant | oxygen, hydrogen, methane, helium4 | lox, lh2, lch4 | 1 |
| sabatier_plant | carbon_dioxide, hydrogen, nickel catalyst | methane, water | 3 |
| chemical_plant | nitrogen, hydrogen, ammonia, sulfur, oxygen, methane, fluorite | ammonia, hydrazine, mmh, nto, af_m315e, sulfuric_acid, apcp | 1 |
| polymer_plant | ethylene, ammonia, fluorite, silicon | polyimide, pet_film, uhmwpe, ptfe, silicone, epoxy, phenolic_resin, pan | 2 |
| fibre_works | pan, basalt, fused_silica, alumina, boron | carbon_fibre, basalt_fibre, glass_fibre, nextel, aramid, vectran | 1 |
| composite_works | carbon_fibre, epoxy, phenolic_resin | cfrp, pica, rcc | 1 |
| ceramics_works | alumina, zirconium, yttrium, boron, carbon, silicon, hafnium | ysz, boron_carbide, silicon_carbide, uhtc, silica_aerogel, fused_silica | 3 |
| regolith_oxygen_plant | lunar_regolith or ilmenite, ysz, power | oxygen, iron, silicon | 9 |
| sinter_printer | lunar_regolith, sulfur, power | sintered_regolith, sulfur_concrete | 10 |
| asteroid_processor | carbonaceous_chondrite, comet_ice | water, carbon, ammonia, carbon_dioxide, ordinary_chondrite metal fraction | 16 |
| metal_refinery | fe_ni_metal, carbon | asteroidal_steel, nickel, cobalt, platinum, iridium | 17 |

### Nuclear
| building | main inputs | outputs | from milestone |
|---|---|---|---|
| enrichment_plant | uranium | haleu, heu | 7 |
| fuel_fabrication_plant | haleu or heu, molybdenum, zirconium, graphite, silicon_carbide, tungsten | u_mo_fuel, uzrh_fuel, triso, w_cermet | 7 |
| fission_reactor (surface) | triso or u_mo_fuel, sodium, haynes_230, beryllium, boron_carbide | power | 7 |
| isotope_separator | lithium, water | lithium6, deuterium | 22 |
| fusion_plant | deuterium, tritium, lithium6, lead, rebco, nb3sn, nbti, helium4 | power, tritium | 22 |
| rtg factory | neptunium237 | pu238 | optional |
| exotic_matter_facility | rt_superconductor, compute, fusion power | exotic_matter | 28 |

### Electronics, compute and energy
| building | main inputs | outputs | from milestone |
|---|---|---|---|
| semiconductor_fab | electronic_silicon, gallium, nitrogen, copper, gold, neon, fluorite, sulfuric_acid, argon | rad_hard_ic, ai_accelerator, gan, silicon_carbide devices | 4 |
| solar_cell_fab | gaas, ingap, germanium, electronic_silicon, silver, fused_silica | mj_solar_cell, si_solar_cell | 4 |
| battery_plant | lithium, cobalt, nickel, graphite, copper, aluminium | li_ion_cell | 4 |
| magnet_works | neodymium, samarium, cobalt, boron, niobium, tin, copper, yttrium, barium | ndfeb_magnet, smco_magnet, nbti, nb3sn, rebco | 13 |
| data_centre | ai_accelerator, power, ammonia or water coolant | compute, ai_models | 5 |

### Life support and habitation
| building | main inputs | outputs | from milestone |
|---|---|---|---|
| life_support_plant | water, carbon_dioxide, zeolite, amine_sorbent, platinum | oxygen, water | 3 |
| greenhouse | water, carbon_dioxide, nitrogen, phosphorus, potassium, power | plant_biomass, spirulina, oxygen | 11 |

### Infrastructure
| building | main inputs | from milestone |
|---|---|---|
| rocket_factory | stainless_steel, al_li_alloy, nickel_superalloy, grcop, cfrp | 1 |
| launch_site | stainless_steel, lox, lch4, helium4, apcp | 1 |
| propellant_depot | al_li_alloy or stainless_steel, polyimide, pet_film, lox, lh2, lch4 | 2 |
| orbital_shipyard | asteroidal_steel, cfrp, ai_models, compute | 18 |
| jump_point_stabiliser | exotic_matter, rt_superconductor, asteroidal_steel, cnt_fibre, compute, ai_models, fusion power | 29 |

## Ship components

| component | tier | main inputs |
|---|---|---|
| structure_truss | P (E for in-space steel) | stainless_steel or al_li_alloy, ti_6al_4v, cfrp; later asteroidal_steel, cnt_fibre |
| propellant_tank | P | stainless_steel or al_li_alloy, cfrp, polyimide, pet_film (insulation) |
| copv (pressure vessel) | P | ti_6al_4v, cfrp, aramid, helium4 |
| kerolox_engine | P | nickel_superalloy, grcop, copper; runs on rp1, lox |
| chemical_engine_methalox | P | nickel_superalloy, grcop, stainless_steel, c103; runs on lch4, lox |
| chemical_engine_hydrolox | P | nickel_superalloy, grcop, ysz (thermal barrier); runs on lh2, lox |
| rcs_thruster | P | rhenium, iridium, c103; runs on hydrazine, mmh, nto or af_m315e |
| hall_thruster | P | smco_magnet, boron and nitrogen (boron nitride channel), copper; runs on argon, krypton or xenon |
| ion_thruster | P | molybdenum or carbon grids, ndfeb_magnet; runs on xenon or iodine |
| ntr_engine | E | triso or w_cermet, zirconium, hafnium control, beryllium reflector; runs on lh2 |
| fission_reactor_ship | E | haleu fuel (triso), haynes_230, sodium, beryllium, boron_carbide, tungsten shield |
| fusion_drive | E | rebco (later rt_superconductor), uhtc, lithium6 or helium3, deuterium, radiator |
| radiator | P | ammonia loop, haynes_230 heat pipes, sodium, cvd_diamond, aluminium |
| solar_array | P | mj_solar_cell or si_solar_cell, polyimide, fused_silica, cfrp |
| battery_pack | P | li_ion_cell |
| habitat_module | P | al_li_alloy or stainless_steel, silicone, fused_silica, silica_aerogel, life_support_unit |
| inflatable_habitat | P | vectran, aramid, polyimide |
| life_support_unit | P | zeolite, amine_sorbent, lioh, platinum, water, oxygen, nitrogen |
| radiation_shield | P | uhmwpe, water, sintered_regolith (surface), tungsten, lead, boron_carbide, bnnt |
| whipple_shield | P | aluminium bumper, nextel or basalt_fibre, aramid |
| heat_shield | P | pica, rcc, phenolic_resin, uhtc |
| mli_blanket | P | polyimide, pet_film, gold or aluminium coating |
| avionics | P | rad_hard_ic, gan, tantalum, copper, gold, ptfe |
