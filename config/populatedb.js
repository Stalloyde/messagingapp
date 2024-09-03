require('dotenv').config();
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // const deleteUsers = prisma.user.deleteMany();
  // const deleteMessage = prisma.message.deleteMany();
  const deleteGroup = prisma.group.deleteMany();
  const deleteGroupMessages = prisma.groupMessages.deleteMany();

  // The transaction runs synchronously so deleteFolder must run last.
  await prisma.$transaction([
    // deleteMessage,
    deleteGroupMessages,
    deleteGroup,
    // deleteUsers,
  ]);

  // await prisma.user.createMany({
  //   data: [
  //     {
  //       id: 1,
  //       username: '123',
  //       password: '123',
  //       status: 'Status123',
  //     },
  //     {
  //       id: 2,
  //       username: 'aaa',
  //       password: 'aaa',
  //       status: 'aaa',
  //     },
  //     {
  //       id: 3,
  //       username: 'bbb',
  //       password: 'bbb',
  //       status: 'bbb',
  //     },
  //   ],
  // });

  // await prisma.message.createMany({
  //   data: [
  //     { userIdFrom: 1, userIdTo: 2, content: 'Message from user 1 to user 2!' },
  //     { userIdFrom: 1, userIdTo: 3, content: 'Message from user 1 to user 3!' },
  //     { userIdFrom: 2, userIdTo: 1, content: 'Message from user 2 to user 1!' },
  //     { userIdFrom: 2, userIdTo: 3, content: 'Message from user 2 to user 3!' },
  //     { userIdFrom: 3, userIdTo: 1, content: 'Message from user 3 to user 1!' },
  //     { userIdFrom: 3, userIdTo: 2, content: 'Message from user 3 to user 2!' },
  //   ],
  // });

  // await prisma.group.create({
  //   data: {
  //     id: 111,
  //     groupName: 'First Group Gang',
  //     participants: {
  //       connect: [{ id: 1 }, { id: 2 }, { id: 3 }],
  //     },
  //   },
  // });

  // await prisma.groupMessages.createMany({
  //   data: [
  //     {
  //       userId: 1,
  //       groupId: 111,
  //       content: 'Message from user 1 to group 111!',
  //     },
  //     {
  //       userId: 2,
  //       groupId: 111,
  //       content: 'Message from user 2 to group 111!',
  //     },
  //     {
  //       userId: 3,
  //       groupId: 111,
  //       content: 'Message from user 3 to group 111!',
  //     },
  //   ],
  // });

  // const a = await prisma.user.findMany({
  //   include: { messagesOut: true, messagesIn: true },
  // });
  // const b = await prisma.message.findMany();
  // const c = await prisma.group.findMany({
  //   include: { participants: true, messages: true },
  // });

  // console.log(a, b, c);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
