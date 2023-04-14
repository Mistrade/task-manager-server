import express from 'express';
import {
  createRequestToFriends,
  getFriendsList,
  getFriendsRequest,
  removeFriendHandler,
  responseOnFriendsOrderHandler,
} from './friends.controller';

const router = express.Router();

// полный путь - /api/friends/

router.post('/create_request', createRequestToFriends);
// router.get('/get_contacts/:contactType', getContactsHandler);
router.post('/get_friends_list', getFriendsList); //так как тут будут фильтры, поэтому пост
router.get('/get_requests_list/:type', getFriendsRequest);
router.post('/accept_or_decline', responseOnFriendsOrderHandler);
router.delete('/remove_friend', removeFriendHandler);

export const FriendsRouter = router;
