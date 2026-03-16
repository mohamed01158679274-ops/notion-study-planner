export default async function handler(req, res) {

const notionToken = process.env.NOTION_TOKEN;

const lecturesDB = "5cd59d50c75e4d3cbf77193d369b1690";
const sectionsDB = "611b4b8e5676473a87cad7e146664e20";
const tasksDB = "7f9b8a2d62fa83ed851981100f5f0555";

function today(){
 return new Date().toISOString().split("T")[0];
}

async function queryDatabase(id){

 const r = await fetch(
  `https://api.notion.com/v1/databases/${id}/query`,
  {
   method:"POST",
   headers:{
    Authorization:`Bearer ${notionToken}`,
    "Content-Type":"application/json",
    "Notion-Version":"2022-06-28"
   },
   body:JSON.stringify({page_size:100})
  }
 );

 const d = await r.json();
 return d.results || [];
}

function pickRandom(arr,n){
 const s=arr.sort(()=>0.5-Math.random());
 return s.slice(0,n);
}

function getTitle(task){
 const p=Object.values(task.properties).find(x=>x.type==="title");
 return p?.title[0]?.plain_text || "Untitled";
}

async function addTask(title){

 await fetch("https://api.notion.com/v1/pages",{
  method:"POST",
  headers:{
   Authorization:`Bearer ${notionToken}`,
   "Content-Type":"application/json",
   "Notion-Version":"2022-06-28"
  },
  body:JSON.stringify({
   parent:{database_id:tasksDB},
   properties:{
    "Task Name":{
     title:[{text:{content:title}}]
    },
    "Scheduled Date":{
     date:{start:today()}
    }
   }
  })
 });

}

const lectures=await queryDatabase(lecturesDB);
const sections=await queryDatabase(sectionsDB);

const selectedLectures=pickRandom(lectures,2);
const selectedSection=pickRandom(sections,1);

const tasks=[...selectedLectures,...selectedSection];

for(const t of tasks){

 const title=getTitle(t);

 await addTask(title);

}

res.json({status:"tasks created"});

}
