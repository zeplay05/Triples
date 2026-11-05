// ข้อมูลรายชื่อสมาชิกแยกตามกลุ่ม (ลบรายชื่อเก่าออกทั้งหมดแล้ว)
// สามารถใส่ข้อมูลใหม่ได้ตามโครงสร้าง:
// { name: "ชื่อสมาชิก", rank: "THE BOSS" หรือ "LEADERS" หรือ "MEMBER", cardClass: "rank-boss" หรือ "rank-leader" หรือ "rank-member", facebook: "https://facebook.com/..." }

export const defaultSections = [
  {
    rankId: "head",
    title: "HEAD",
    cardClass: "rank-boss",
    badgeTitle: "Head",
    members: []
  },
  {
    rankId: "leader",
    title: "LEADERS",
    cardClass: "rank-leader",
    badgeTitle: "Leader",
    members: []
  },
  {
    rankId: "respect",
    title: "RESPECT",
    cardClass: "rank-respect",
    badgeTitle: "Respect",
    members: []
  },
  {
    rankId: "lastname",
    title: "LASTNAME",
    cardClass: "rank-lastname",
    badgeTitle: "Lastname",
    members: []
  },
  {
    rankId: "member",
    title: "MEMBER",
    cardClass: "rank-member",
    badgeTitle: "Member",
    members: []
  }
];

export const membersByGroup = {
  'MAIN TRIPLES': JSON.parse(JSON.stringify(defaultSections)),
  'TRIPLES PERFECT': JSON.parse(JSON.stringify(defaultSections)),
  'TRIPLES LADY': JSON.parse(JSON.stringify(defaultSections)),
  'TAMSTEP': JSON.parse(JSON.stringify(defaultSections)),
  'PERFECT': JSON.parse(JSON.stringify(defaultSections)),
  'HEREWEGOAGAIN': JSON.parse(JSON.stringify(defaultSections)),
  'BABYYOUOK': JSON.parse(JSON.stringify(defaultSections)),
  'ROCKS': JSON.parse(JSON.stringify(defaultSections)),
};
