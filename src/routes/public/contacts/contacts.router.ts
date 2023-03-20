import express from 'express';
import {
  addContactHandler,
  getContactsHandler,
  removeFriendHandler,
  responseOnFriendsOrderHandler,
} from './contacts.controller';

const router = express.Router();

router.post('/add_contact', addContactHandler);
router.get('/get_contacts/:contactType', getContactsHandler);
router.post('/response_on_friends_order', responseOnFriendsOrderHandler);
router.post('/remove_friend', removeFriendHandler);
export const ContactsRouter = router;
