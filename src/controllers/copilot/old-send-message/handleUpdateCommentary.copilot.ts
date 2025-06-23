import { Post } from "../../../models";
import { createTextPostContent } from "../../post/text.v1.controller";

const handleUpdateCommentary = async ({
  ctx,
  conversation,
  args,
}: {
  ctx: any;
  conversation: any;
  args: any;
}) => {
  console.log("handleUpdateCommentary: ", args);

  const postId = conversation.postId;

  if (!postId) {
    return ctx.json({
      success: false,
      message: "Post ID not found in conversation",
    });
  }

  const post = await Post.findById(postId);
  if (!post) {
    return ctx.json({
      success: false,
      message: "Post not found",
    });
  }

  // const newCommentary = args.prompt;
  const newCommentary = await createTextPostContent({
    context: post.commentary,
    preference: {
      prompt: args.prompt,
      webSearch: true,
    },
  });

  post.commentary = newCommentary;
  post.status = "draft";

  await post.save();

  return ctx.json({
    success: true,
    data: {
      message: args.summary,
      conversationId: conversation._id,
      trigger: "update-commentary",
    },
  });
};

export default handleUpdateCommentary;
