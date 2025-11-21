use anchor_lang::prelude::*;
use crate::{constants::*, errors::*, events::*, state::*};

/// Comment on a post
/// 
/// Validation:
/// - User must be a member of the community
/// - Content URI must be within length limits
/// 
/// Events: CommentCreated
#[derive(Accounts)]
pub struct CommentOnPost<'info> {
    #[account(mut)]
    pub post: Account<'info, PostAccount>,
    
    #[account(
        seeds = [MEMBERSHIP_SEED, post.community.as_ref(), commenter.key().as_ref()],
        bump
    )]
    pub membership: Account<'info, MembershipAccount>,
    
    #[account(
        init,
        payer = commenter,
        space = COMMENT_SIZE,
        seeds = [COMMENT_SEED, post.key().as_ref(), &post.comments_count.to_le_bytes()],
        bump
    )]
    pub comment: Account<'info, CommentAccount>,
    
    #[account(mut)]
    pub commenter: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn comment_on_post(
    ctx: Context<CommentOnPost>,
    content_uri: String,
    content_hash: [u8; 32],
) -> Result<()> {
    // Validate content URI length
    require!(
        content_uri.len() <= MAX_CONTENT_URI_LEN,
        SocialError::ContentUriTooLong
    );
    
    let post = &mut ctx.accounts.post;
    let comment = &mut ctx.accounts.comment;
    let clock = Clock::get()?;
    
    let comment_id = post.comments_count;
    
    comment.post = post.key();
    comment.commenter = ctx.accounts.commenter.key();
    comment.comment_id = comment_id;
    comment.content_uri = content_uri;
    comment.content_hash = content_hash;
    comment.created_at = clock.unix_timestamp;
    
    // Increment comment count
    post.comments_count = post.comments_count
        .checked_add(1)
        .ok_or(SocialError::ArithmeticOverflow)?;
    
    emit!(CommentCreated {
        comment: comment.key(),
        post: post.key(),
        comment_id: comment_id as u32,
        commenter: ctx.accounts.commenter.key(),
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}
