use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::{constants::*, errors::*, events::*, state::*};

/// Tip a post creator
/// 
/// This is a direct SOL transfer from tipper to post author.
/// The program tracks the total tips received on-chain.
/// 
/// Validation:
/// - Post must not be anonymous (must have an author)
/// - Amount must match FIXED_TIP_AMOUNT (0.002 SOL)
/// - Tipper cannot tip their own post
/// 
/// Events: PostTipped
#[derive(Accounts)]
pub struct TipPost<'info> {
    #[account(mut)]
    pub post: Account<'info, PostAccount>,
    
    /// CHECK: This is the post author who receives the tip
    #[account(
        mut,
        constraint = post.author.is_some() @ SocialError::InvalidTipAmount,
        constraint = post.author.unwrap() == recipient.key() @ SocialError::InvalidTipAmount
    )]
    pub recipient: AccountInfo<'info>,
    
    #[account(mut)]
    pub tipper: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn tip_post(ctx: Context<TipPost>, amount: u64) -> Result<()> {
    // Validate amount is the fixed tip amount
    require!(
        amount == FIXED_TIP_AMOUNT,
        SocialError::InvalidTipAmount
    );
    
    let post = &mut ctx.accounts.post;
    
    // Check not tipping own post
    if let Some(author) = post.author {
        require!(
            author != ctx.accounts.tipper.key(),
            SocialError::CannotLikeOwnPost // Reuse error for similar logic
        );
    }
    
    // Transfer SOL from tipper to post author
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.tipper.to_account_info(),
                to: ctx.accounts.recipient.to_account_info(),
            },
        ),
        amount,
    )?;
    
    // Update total tips received
    post.total_tip_lamports = post.total_tip_lamports
        .checked_add(amount)
        .ok_or(SocialError::ArithmeticOverflow)?;
    
    let clock = Clock::get()?;
    
    emit!(PostTipped {
        post: post.key(),
        tipper: ctx.accounts.tipper.key(),
        recipient: ctx.accounts.recipient.key(),
        amount,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}
