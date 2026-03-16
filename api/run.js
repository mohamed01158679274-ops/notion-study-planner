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

async function updateStatus(pageID) {

  await fetch(`https://api.notion.com/v1/pages/${pageID}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28"
    },
    body: JSON.stringify({
      properties: {
        "Status": {
          select: { name: "Done" }
        }
      }
    })
  });

}

async function syncCompletedTasks() {

  const response = await fetch(
    `https://api.notion.com/v1/databases/${tasksDB}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
      },
      body: JSON.stringify({
        filter: {
          property: "Status",
          select: { equals: "Done" }
        }
      })
    }
  );

  const data = await response.json();

  const usedLectures = new Set();
  const usedSections = new Set();

  for (const task of data.results || []) {

    const lectures =
      task.properties["Related Lecture"]?.relation || [];

    const sections =
      task.properties["Related Section"]?.relation || [];

    for (const l of lectures) {
      await updateStatus(l.id);
      usedLectures.add(l.id);
    }

    for (const s of sections) {
      await updateStatus(s.id);
      usedSections.add(s.id);
    }
  }

  return { usedLectures, usedSections };
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

async function run() {

  const { usedLectures, usedSections } =
    await syncCompletedTasks();

  const lectures = await queryDatabase(lecturesDB);
  const sections = await queryDatabase(sectionsDB);

  const availableLectures =
    lectures.filter(l => !usedLectures.has(l.id));

  const availableSections =
    sections.filter(s => !usedSections.has(s.id));

  const selectedLectures = pickRandom(availableLectures, 2);
  const selectedSection = pickRandom(availableSections, 1);

  for (const lecture of selectedLectures) {

    const title = getTitle(lecture);

    await addLectureTask(title, lecture.id);

    console.log("Lecture added:", title);
  }

  for (const section of selectedSection) {

    const title = getTitle(section);

    await addSectionTask(title, section.id);

    console.log("Section added:", title);
  }

}

run();
