import express from "express";
import {changeGroupIsSelect, getGroupInfoById, getGroupList} from "./groups-controller";

const router = express.Router()

// полный путь - /api/planning/events/groups/

router.post('/get_groups_list', getGroupList)  //groups
router.post('/change_select_group', changeGroupIsSelect) //groups
// router.post('/create', handlers.createCalendar) //groups
// router.post('/remove', handlers.removeCalendar) //groups
// router.post('/update', handlers.updateCalendarInfo) //groups
router.get('/info/:groupId', getGroupInfoById) //groups

export const GroupsRouter = router