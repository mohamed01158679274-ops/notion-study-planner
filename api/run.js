export default async function handler(req, res) {

const notionToken = process.env.NOTION_TOKEN;

const lecturesDB = "5cd59d50c75e4d3cbf77193d369b1690";
const sectionsDB = "611b4b8e5676473a87cad7e146664e20";
const tasksDB = "7f9b8a2d62fa83ed851981100f5f0555";

function today() {
  return new Date().toISOString().split("T")[0];
}

async function queryDatabase(databaseID) {

  const response = await fetch(
    `https://api.notion.com/v1/databases/${databaseID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
      },
      body: JSON.stringify({ page_size: 100 })
    }
  );

  const data = await response.json();
  return data.results || [];
}

function getTitle(task) {

  const titleProp = Object.values(task.properties)
    .find(p => p.type === "title");

  return titleProp?.title?.[0]?.plain_text || "Untitled";
}

function pickRandom(array, count) {

  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

async function addLectureTask(title, lectureID) {

  await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28"
    },
    body: JSON.stringify({
      parent: { database_id: tasksDB },
      properties: {

        "Task Name": {
          title: [{ text: { content: title } }]
        },

        "Related Lecture": {
          relation: [{ id: lectureID }]
        },

        "Type": {
          select: { name: "Lecture" }
        },

        "Scheduled Date": {
          date: { start: today() }
        },

        "Priority": {
          select: { name: "Medium" }
        },

        "Status": {
          select: { name: "Not started" }
        }

      }
    })
  });

}

async function addSectionTask(title, sectionID) {

  await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28"
    },
    body: JSON.stringify({
      parent: { database_id: tasksDB },
      properties: {

        "Task Name": {
          title: [{ text: { content: title } }]
        },

        "Related Section": {
          relation: [{ id: sectionID }]
        },

        "Type": {
          select: { name: "Section" }
        },

        "Scheduled Date": {
          date: { start: today() }
        },

        "Priority": {
          select: { name: "Medium" }
        },

        "Status": {
          select: { name: "Not started" }
        }

      }
    })
  });

}

const lectures = await queryDatabase(lecturesDB);
const sections = await queryDatabase(sectionsDB);

const selectedLectures = pickRandom(lectures, 2);
const selectedSection = pickRandom(sections, 1);

for (const lecture of selectedLectures) {

  const title = getTitle(lecture);
  await addLectureTask(title, lecture.id);

}

for (const section of selectedSection) {

  const title = getTitle(section);
  await addSectionTask(title, section.id);

}

res.status(200).json({ status: "tasks created" });

}
