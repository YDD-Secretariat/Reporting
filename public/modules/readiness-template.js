const choices=['Ready','In progress','Not ready'];
export const template={title:'2026 Youth Leaders’ Capacity Building & National Leaders Retreat',text:`23–25 October 2026 • Hybrid programme
Theme: Godliness (1 Timothy 6:11)
Please submit your area’s readiness by Wednesday, 14 October 2026. Read the guidance below before completing your update. The link’s closing time is displayed above.

CRITICAL READINESS CHECKS
The source confirmation form states that a camp/hub must not proceed while any critical factor remains incomplete. Report gaps honestly and escalate them to the secretariat; submitting this form is not approval to proceed.

1. Venue and capacity
Confirm the primary venue with a written booking. Document sufficient capacity for expected attendance and identify a backup venue. Plan the main hall, breakout spaces and accommodation for Corps members, AFCF leaders, YDD leaders and other officers.

2. Technology and connectivity
Test stable internet of at least 10–15 Mbps for the live connection to WECA HQ. Provide backup internet, tested projector/screen/speakers and backup power. Assign dedicated ICT personnel for all combined sessions and schedule a full dry-run.

3. Local team and governance
Constitute the planning team and appoint Programme, Welfare, Security, ICT and Prayer leads. Brief the Area Overseer and secure written support. Select local facilitators early for the article review and expository sessions that do not connect to WECA.

4. Security and welfare
Arrange approved security (the source suggests approximately one person per 50–75 attendees). Complete a risk assessment and identify the nearest police station and hospital. Provide first aid and basic medical supplies. Finalise feeding, drinking water and sanitation, plus accommodation and transport where applicable.

5. Participants and communication
Activate registration tracking and confirm minimum viable attendance. Set up a moderated Area/Hub WhatsApp group, an emergency communication tree and a participant information pack covering schedule, local rules and contacts. Notify all expected attendees and supporting departments, including Choir, WCS and Transport.

PROGRAMME DELIVERY GUIDE
Arrival and welcome: prepare tags and files containing a pen, programme, outline and supporting materials. Arrange lively introductions and meet-and-greet activities. Mixed platoons of students and Corps members can support bonding and Saturday jogging/drilling. Explain location-specific rules.

Anthem and printed materials: include “Search me, O God” in the pack and teach it during the welcome programme. Use verses 1 and 3 for the anthem; all verses may be sung as a congregational song. Print the detailed programme, AFCF materials and “The Peril of Hypocrisy” by Dwight Baltzel for the article review. Select the article facilitator early. AFCF Coordinators/Secretaries should bring their Coordinators Guide.

Prayer, music and exposition: encourage students/Corps members to lead morning prayers and Sunday School review. Prayerfully plan choir and congregational songs around the programme flow. The expository session is “A Form of Godliness”; select a Pastor or Senior Minister who connects with young people, using the supplied talking-point guide. The Overseer handles the welcome programme.

SIDE ENGAGEMENTS — PLAN FOR FRIDAY OR SATURDAY NIGHT
AFCMF: January/February 2027 outreach and proposed location; Batch C 2026 orientation camp; Corpers Lodge.
AFCF: AFCF Portal; welcome programme planning; National Revival Programme; YDD leaders’ fellowship involvement; strengthening the alumni group.
YDD leaders: mentoring future leaders, leadership capacity, local matters and upcoming programmes.

PEOPLE, MEMORIES AND FOLLOW-UP
Identify outgoing Corps members and budget for gifts. Address vacancies among school, branch and area officers through the appropriate appointment process. Arrange a photographer and a photo session with the Overseer or representative and attending Pastors/Ministers.
Assign a reporting lead. Review the YDD portal reporting template and complete it alongside the programme so the final report is timely.

ATTENDANCE AND BUDGET PLANNING
Prepare an attendance breakdown by district: serving Corps members; final-year/intending Corps members; ex-Corps members and NYSC officers; AFCF leaders; YDD leaders. Reconcile these categories to the total without double counting.
Prepare a draft budget showing population, unit rate and amount in naira for feeding, transport allowance, souvenirs/gifts, photocopies/materials, outreach logistics, calls/communication and miscellaneous costs. Add other relevant items and total the budget. Note anticipated successes and any additional support needed.`,fields:[
{id:'venue',label:'Hub / venue name and location',type:'text',required:true},
{id:'contact',label:'Contact person / Area Lead or Coordinator',type:'text',required:true},
{id:'phone',label:'Contact phone / WhatsApp',type:'text',required:true},
{id:'venue_ready',label:'Venue: written booking, adequate capacity and backup confirmed',type:'select',required:true,options:choices},
{id:'tech_ready',label:'Technology: tested internet, backup connection/power, audiovisual equipment and ICT lead',type:'select',required:true,options:choices},
{id:'team_ready',label:'Governance: planning team, unit leads and written Overseer support',type:'select',required:true,options:choices},
{id:'welfare_ready',label:'Security/welfare: security, risk assessment, emergency services, first aid, feeding/water/sanitation',type:'select',required:true,options:choices},
{id:'comms_ready',label:'Communication: registration, viable attendance, moderated group, information pack and emergency tree',type:'select',required:true,options:choices},
{id:'programme_ready',label:'Programme: facilitators, music, printed materials, side engagements and reporting lead',type:'select',required:true,options:choices},
{id:'count',label:'Expected participant count (workers / officers)',type:'number',required:true},
{id:'dry_run',label:'Planned or completed dry-run / technology test date',type:'date',required:true},
{id:'overall',label:'Overall readiness',type:'select',required:true,options:['Fully Ready','Mostly Ready (minor gaps)','Not Ready']},
{id:'gaps',label:'Outstanding items, responsible persons and expected completion dates (write None if complete)',type:'textarea',required:true},
{id:'budget',label:'Draft budget total (₦), attendance breakdown and logistics notes',type:'textarea',required:false},
{id:'support',label:'Other anticipated successes or support required',type:'textarea',required:false},
{id:'confirm',label:'I have read the guidance and confirm this update accurately represents my area’s readiness',type:'select',required:true,options:['Yes','No — clarification needed']}
]};
