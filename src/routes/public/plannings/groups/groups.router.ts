import express from 'express';
import {
  changeGroupIsSelect,
  createGroup,
  getGroupInfoById,
  getGroupList,
  removeGroup,
  updateGroupInfo,
} from './groups.controller';

const router = express.Router();

// полный путь - /api/planning/events/groups/

router.post('/get_groups_list', getGroupList); //groups
router.post('/change_select_group', changeGroupIsSelect); //groups
router.post('/create', createGroup); //groups
router.post('/remove', removeGroup); //groups
router.post('/update', updateGroupInfo); //groups
router.get('/info/:groupId', getGroupInfoById); //groups

export const GroupsRouter = router;
