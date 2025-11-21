/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/social_program.json`.
 */
export type SocialProgram = {
  "address": "54KY3Gg1zcRzvHH64tfoBM3T1mDaahaXUEWv9GCkGoye",
  "metadata": {
    "name": "socialProgram",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "commentOnPost",
      "discriminator": [
        67,
        195,
        232,
        34,
        136,
        34,
        75,
        239
      ],
      "accounts": [
        {
          "name": "post",
          "writable": true
        },
        {
          "name": "membership",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114,
                  115,
                  104,
                  105,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "post.community",
                "account": "postAccount"
              },
              {
                "kind": "account",
                "path": "commenter"
              }
            ]
          }
        },
        {
          "name": "comment",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "post"
              },
              {
                "kind": "account",
                "path": "post.comments_count",
                "account": "postAccount"
              }
            ]
          }
        },
        {
          "name": "commenter",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "contentUri",
          "type": "string"
        },
        {
          "name": "contentHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "createCommunity",
      "discriminator": [
        203,
        214,
        176,
        194,
        13,
        207,
        22,
        60
      ],
      "accounts": [
        {
          "name": "community",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  109,
                  117,
                  110,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "arg",
                "path": "communityId"
              }
            ]
          }
        },
        {
          "name": "creatorProfile",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              }
            ]
          }
        },
        {
          "name": "membership",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114,
                  115,
                  104,
                  105,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "community"
              },
              {
                "kind": "account",
                "path": "creator"
              }
            ]
          }
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "descriptionUri",
          "type": "string"
        },
        {
          "name": "communityId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createPoll",
      "discriminator": [
        182,
        171,
        112,
        238,
        6,
        219,
        14,
        110
      ],
      "accounts": [
        {
          "name": "community",
          "writable": true
        },
        {
          "name": "membership",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114,
                  115,
                  104,
                  105,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "community"
              },
              {
                "kind": "account",
                "path": "creator"
              }
            ]
          }
        },
        {
          "name": "poll",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  108,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "community"
              },
              {
                "kind": "account",
                "path": "community.poll_counter",
                "account": "communityAccount"
              }
            ]
          }
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "questionUri",
          "type": "string"
        },
        {
          "name": "optionProfiles",
          "type": {
            "vec": "pubkey"
          }
        },
        {
          "name": "endTime",
          "type": "i64"
        }
      ]
    },
    {
      "name": "createPost",
      "discriminator": [
        123,
        92,
        184,
        29,
        231,
        24,
        15,
        202
      ],
      "accounts": [
        {
          "name": "community",
          "writable": true
        },
        {
          "name": "membership",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114,
                  115,
                  104,
                  105,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "community"
              },
              {
                "kind": "account",
                "path": "author"
              }
            ]
          }
        },
        {
          "name": "post",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "community"
              },
              {
                "kind": "account",
                "path": "community.post_counter",
                "account": "communityAccount"
              }
            ]
          }
        },
        {
          "name": "author",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "contentUri",
          "type": "string"
        },
        {
          "name": "contentHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "isAnonymous",
          "type": "bool"
        },
        {
          "name": "pseudonym",
          "type": {
            "option": "string"
          }
        }
      ]
    },
    {
      "name": "createProfile",
      "discriminator": [
        225,
        205,
        234,
        143,
        17,
        186,
        50,
        220
      ],
      "accounts": [
        {
          "name": "profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "displayName",
          "type": "string"
        },
        {
          "name": "avatarUri",
          "type": "string"
        }
      ]
    },
    {
      "name": "followUser",
      "discriminator": [
        126,
        176,
        97,
        36,
        63,
        145,
        4,
        134
      ],
      "accounts": [
        {
          "name": "followerProfile",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "followedProfile",
          "writable": true
        },
        {
          "name": "follow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  111,
                  108,
                  108,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "followerProfile"
              },
              {
                "kind": "account",
                "path": "followedProfile"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "followerProfile"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "joinCommunity",
      "discriminator": [
        252,
        106,
        147,
        30,
        134,
        74,
        28,
        232
      ],
      "accounts": [
        {
          "name": "community",
          "writable": true
        },
        {
          "name": "userProfile",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "membership",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114,
                  115,
                  104,
                  105,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "community"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "leaveCommunity",
      "discriminator": [
        218,
        140,
        41,
        66,
        8,
        140,
        33,
        161
      ],
      "accounts": [
        {
          "name": "community",
          "writable": true,
          "relations": [
            "membership"
          ]
        },
        {
          "name": "membership",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114,
                  115,
                  104,
                  105,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "community"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true,
          "relations": [
            "membership"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "likePost",
      "discriminator": [
        45,
        242,
        154,
        71,
        63,
        133,
        54,
        186
      ],
      "accounts": [
        {
          "name": "post",
          "writable": true
        },
        {
          "name": "membership",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114,
                  115,
                  104,
                  105,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "post.community",
                "account": "postAccount"
              },
              {
                "kind": "account",
                "path": "liker"
              }
            ]
          }
        },
        {
          "name": "like",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "post"
              },
              {
                "kind": "account",
                "path": "liker"
              }
            ]
          }
        },
        {
          "name": "liker",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "tipPost",
      "discriminator": [
        23,
        199,
        181,
        108,
        91,
        128,
        240,
        112
      ],
      "accounts": [
        {
          "name": "post",
          "writable": true
        },
        {
          "name": "recipient",
          "writable": true
        },
        {
          "name": "tipper",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "unfollowUser",
      "discriminator": [
        204,
        183,
        196,
        110,
        97,
        165,
        226,
        213
      ],
      "accounts": [
        {
          "name": "followerProfile",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "followedProfile",
          "writable": true
        },
        {
          "name": "follow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  111,
                  108,
                  108,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "followerProfile"
              },
              {
                "kind": "account",
                "path": "followedProfile"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "followerProfile"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "unlikePost",
      "discriminator": [
        236,
        63,
        6,
        34,
        128,
        3,
        114,
        174
      ],
      "accounts": [
        {
          "name": "post",
          "writable": true,
          "relations": [
            "like"
          ]
        },
        {
          "name": "like",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "post"
              },
              {
                "kind": "account",
                "path": "liker"
              }
            ]
          }
        },
        {
          "name": "liker",
          "writable": true,
          "signer": true,
          "relations": [
            "like"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "updateProfile",
      "discriminator": [
        98,
        67,
        99,
        206,
        86,
        115,
        175,
        1
      ],
      "accounts": [
        {
          "name": "profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "profile"
          ]
        }
      ],
      "args": [
        {
          "name": "displayName",
          "type": {
            "option": "string"
          }
        },
        {
          "name": "avatarUri",
          "type": {
            "option": "string"
          }
        }
      ]
    },
    {
      "name": "votePoll",
      "discriminator": [
        154,
        219,
        48,
        148,
        149,
        7,
        153,
        194
      ],
      "accounts": [
        {
          "name": "poll",
          "writable": true
        },
        {
          "name": "membership",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114,
                  115,
                  104,
                  105,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "poll.community",
                "account": "pollAccount"
              },
              {
                "kind": "account",
                "path": "voter"
              }
            ]
          }
        },
        {
          "name": "vote",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "poll"
              },
              {
                "kind": "account",
                "path": "voter"
              }
            ]
          }
        },
        {
          "name": "voter",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "optionIndex",
          "type": "u8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "commentAccount",
      "discriminator": [
        42,
        146,
        173,
        246,
        2,
        22,
        223,
        91
      ]
    },
    {
      "name": "communityAccount",
      "discriminator": [
        111,
        62,
        119,
        115,
        144,
        161,
        149,
        151
      ]
    },
    {
      "name": "followAccount",
      "discriminator": [
        174,
        177,
        136,
        60,
        138,
        84,
        148,
        209
      ]
    },
    {
      "name": "likeAccount",
      "discriminator": [
        17,
        111,
        153,
        7,
        26,
        150,
        125,
        157
      ]
    },
    {
      "name": "membershipAccount",
      "discriminator": [
        164,
        147,
        172,
        253,
        226,
        190,
        182,
        75
      ]
    },
    {
      "name": "pollAccount",
      "discriminator": [
        109,
        254,
        117,
        41,
        232,
        74,
        172,
        45
      ]
    },
    {
      "name": "postAccount",
      "discriminator": [
        85,
        236,
        139,
        84,
        240,
        243,
        196,
        23
      ]
    },
    {
      "name": "profileAccount",
      "discriminator": [
        105,
        84,
        179,
        172,
        116,
        226,
        171,
        52
      ]
    },
    {
      "name": "voteAccount",
      "discriminator": [
        203,
        238,
        154,
        106,
        200,
        131,
        0,
        41
      ]
    }
  ],
  "events": [
    {
      "name": "commentCreated",
      "discriminator": [
        27,
        186,
        105,
        74,
        47,
        93,
        2,
        106
      ]
    },
    {
      "name": "communityCreated",
      "discriminator": [
        218,
        186,
        205,
        161,
        125,
        58,
        101,
        64
      ]
    },
    {
      "name": "communityJoined",
      "discriminator": [
        190,
        37,
        146,
        238,
        28,
        83,
        251,
        118
      ]
    },
    {
      "name": "communityLeft",
      "discriminator": [
        220,
        174,
        140,
        181,
        170,
        32,
        253,
        52
      ]
    },
    {
      "name": "pollCreated",
      "discriminator": [
        137,
        85,
        250,
        148,
        2,
        9,
        178,
        39
      ]
    },
    {
      "name": "pollVoted",
      "discriminator": [
        107,
        135,
        33,
        68,
        58,
        110,
        42,
        92
      ]
    },
    {
      "name": "postCreated",
      "discriminator": [
        209,
        178,
        232,
        24,
        158,
        92,
        77,
        227
      ]
    },
    {
      "name": "postLiked",
      "discriminator": [
        73,
        27,
        139,
        100,
        14,
        89,
        19,
        81
      ]
    },
    {
      "name": "postTipped",
      "discriminator": [
        113,
        128,
        181,
        234,
        81,
        106,
        48,
        78
      ]
    },
    {
      "name": "postUnliked",
      "discriminator": [
        134,
        105,
        196,
        139,
        213,
        120,
        103,
        204
      ]
    },
    {
      "name": "profileCreated",
      "discriminator": [
        134,
        233,
        199,
        153,
        77,
        206,
        128,
        94
      ]
    },
    {
      "name": "profileUpdated",
      "discriminator": [
        186,
        248,
        62,
        98,
        112,
        98,
        161,
        252
      ]
    },
    {
      "name": "userFollowed",
      "discriminator": [
        202,
        223,
        169,
        156,
        158,
        234,
        167,
        17
      ]
    },
    {
      "name": "userUnfollowed",
      "discriminator": [
        32,
        94,
        90,
        159,
        86,
        18,
        124,
        254
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "displayNameTooLong",
      "msg": "Display name is too long"
    },
    {
      "code": 6001,
      "name": "avatarUriTooLong",
      "msg": "Avatar URI is too long"
    },
    {
      "code": 6002,
      "name": "contentUriTooLong",
      "msg": "Content URI is too long"
    },
    {
      "code": 6003,
      "name": "questionUriTooLong",
      "msg": "Question URI is too long"
    },
    {
      "code": 6004,
      "name": "communityNameTooLong",
      "msg": "Community name is too long"
    },
    {
      "code": 6005,
      "name": "descriptionUriTooLong",
      "msg": "Description URI is too long"
    },
    {
      "code": 6006,
      "name": "pseudonymRequired",
      "msg": "Pseudonym is required for anonymous posts"
    },
    {
      "code": 6007,
      "name": "pseudonymTooLong",
      "msg": "Pseudonym is too long"
    },
    {
      "code": 6008,
      "name": "pseudonymNotAllowed",
      "msg": "Pseudonym not allowed for non-anonymous posts"
    },
    {
      "code": 6009,
      "name": "cannotFollowSelf",
      "msg": "Cannot follow yourself"
    },
    {
      "code": 6010,
      "name": "cannotLikeOwnPost",
      "msg": "Cannot like your own post"
    },
    {
      "code": 6011,
      "name": "notFollowing",
      "msg": "Not following this user"
    },
    {
      "code": 6012,
      "name": "invalidTipAmount",
      "msg": "Invalid tip amount"
    },
    {
      "code": 6013,
      "name": "tooManyPollOptions",
      "msg": "Too many poll options"
    },
    {
      "code": 6014,
      "name": "pollEnded",
      "msg": "Poll has ended"
    },
    {
      "code": 6015,
      "name": "invalidPollOption",
      "msg": "Invalid poll option"
    },
    {
      "code": 6016,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow"
    }
  ],
  "types": [
    {
      "name": "commentAccount",
      "docs": [
        "Comment account",
        "PDA: [\"comment\", post_pubkey, comment_id (u64)]",
        "",
        "Represents a comment on a post. Content is off-chain.",
        "Comment ID is derived from post's comment_counter."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "post",
            "docs": [
              "Post this comment belongs to"
            ],
            "type": "pubkey"
          },
          {
            "name": "commenter",
            "docs": [
              "User who commented"
            ],
            "type": "pubkey"
          },
          {
            "name": "commentId",
            "docs": [
              "Sequential ID within the post"
            ],
            "type": "u64"
          },
          {
            "name": "contentUri",
            "docs": [
              "URI to comment content (IPFS/Arweave)"
            ],
            "type": "string"
          },
          {
            "name": "contentHash",
            "docs": [
              "Hash of content for integrity"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "createdAt",
            "docs": [
              "Timestamp when comment was created"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "commentCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "comment",
            "type": "pubkey"
          },
          {
            "name": "post",
            "type": "pubkey"
          },
          {
            "name": "commentId",
            "type": "u32"
          },
          {
            "name": "commenter",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "communityAccount",
      "docs": [
        "Community account",
        "PDA: [\"community\", community_id (u64)]",
        "",
        "Represents a community (like a subreddit). Anyone can create.",
        "Description is stored off-chain (URI) to save space.",
        "Counters are maintained on-chain for generating sequential IDs."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "docs": [
              "Community name"
            ],
            "type": "string"
          },
          {
            "name": "descriptionUri",
            "docs": [
              "URI to full description/rules (IPFS/Arweave)"
            ],
            "type": "string"
          },
          {
            "name": "creator",
            "docs": [
              "Creator's public key"
            ],
            "type": "pubkey"
          },
          {
            "name": "communityId",
            "docs": [
              "Unique ID for this community"
            ],
            "type": "u64"
          },
          {
            "name": "memberCount",
            "docs": [
              "Total number of members"
            ],
            "type": "u64"
          },
          {
            "name": "postCounter",
            "docs": [
              "Counter for generating post IDs"
            ],
            "type": "u64"
          },
          {
            "name": "pollCounter",
            "docs": [
              "Counter for generating poll IDs"
            ],
            "type": "u64"
          },
          {
            "name": "createdAt",
            "docs": [
              "Timestamp when community was created"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "communityCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "community",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "communityJoined",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "community",
            "type": "pubkey"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "communityLeft",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "community",
            "type": "pubkey"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "followAccount",
      "docs": [
        "Follow relationship",
        "PDA: [\"follow\", follower_wallet, followed_wallet]",
        "",
        "Records that one user follows another. Used to enforce",
        "one-follow-per-pair and to allow unfollow functionality."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "follower",
            "docs": [
              "User who is following"
            ],
            "type": "pubkey"
          },
          {
            "name": "followed",
            "docs": [
              "User being followed"
            ],
            "type": "pubkey"
          },
          {
            "name": "followedAt",
            "docs": [
              "Timestamp when follow occurred"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "likeAccount",
      "docs": [
        "Like record",
        "PDA: [\"like\", post_pubkey, user_wallet]",
        "",
        "Records that a user liked a post. Used to enforce one-like-per-user",
        "and to allow unlike functionality."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "post",
            "docs": [
              "Post that was liked"
            ],
            "type": "pubkey"
          },
          {
            "name": "liker",
            "docs": [
              "User who liked"
            ],
            "type": "pubkey"
          },
          {
            "name": "likedAt",
            "docs": [
              "Timestamp when liked"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "membershipAccount",
      "docs": [
        "Membership record",
        "PDA: [\"membership\", community_pubkey, user_wallet]",
        "",
        "Proves a user is a member of a community. Required to post, vote, etc.",
        "Small account for efficient lookups."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "community",
            "docs": [
              "Community this membership belongs to"
            ],
            "type": "pubkey"
          },
          {
            "name": "user",
            "docs": [
              "User who is a member"
            ],
            "type": "pubkey"
          },
          {
            "name": "joinedAt",
            "docs": [
              "Timestamp when user joined"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "pollAccount",
      "docs": [
        "Poll account",
        "PDA: [\"poll\", community_pubkey, poll_id (u64)]",
        "",
        "Represents a poll in a community. Options are user profiles (Pubkeys).",
        "Vote counts are maintained on-chain for transparency.",
        "Question details are off-chain (URI)."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "community",
            "docs": [
              "Community where poll was created"
            ],
            "type": "pubkey"
          },
          {
            "name": "pollId",
            "docs": [
              "Sequential ID within the community"
            ],
            "type": "u64"
          },
          {
            "name": "questionUri",
            "docs": [
              "URI to poll question/description"
            ],
            "type": "string"
          },
          {
            "name": "optionProfiles",
            "docs": [
              "Profile pubkeys that are options in this poll"
            ],
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "votesPerOption",
            "docs": [
              "Vote count for each option (parallel to option_profiles)"
            ],
            "type": {
              "vec": "u32"
            }
          },
          {
            "name": "createdBy",
            "docs": [
              "Creator of the poll"
            ],
            "type": "pubkey"
          },
          {
            "name": "endTime",
            "docs": [
              "Unix timestamp when poll ends"
            ],
            "type": "i64"
          },
          {
            "name": "createdAt",
            "docs": [
              "Timestamp when poll was created"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "pollCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "poll",
            "type": "pubkey"
          },
          {
            "name": "community",
            "type": "pubkey"
          },
          {
            "name": "pollId",
            "type": "u64"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "endTime",
            "type": "i64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "pollVoted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "poll",
            "type": "pubkey"
          },
          {
            "name": "voter",
            "type": "pubkey"
          },
          {
            "name": "optionIndex",
            "type": "u8"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "postAccount",
      "docs": [
        "Post account",
        "PDA: [\"post\", community_pubkey, post_id (u64)]",
        "",
        "Represents a post in a community. Content is off-chain (URI + hash).",
        "Author can be None for anonymous posts (ghost mode).",
        "Counters track engagement metrics on-chain."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "community",
            "docs": [
              "Community where post was created"
            ],
            "type": "pubkey"
          },
          {
            "name": "postId",
            "docs": [
              "Sequential ID within the community"
            ],
            "type": "u64"
          },
          {
            "name": "contentUri",
            "docs": [
              "URI to post content (IPFS/Arweave)"
            ],
            "type": "string"
          },
          {
            "name": "contentHash",
            "docs": [
              "Hash of content for integrity verification"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "author",
            "docs": [
              "Author's public key (None if anonymous)"
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "pseudonym",
            "docs": [
              "Pseudonym for anonymous posts"
            ],
            "type": {
              "option": "string"
            }
          },
          {
            "name": "likesCount",
            "docs": [
              "Number of likes"
            ],
            "type": "u64"
          },
          {
            "name": "commentsCount",
            "docs": [
              "Number of comments"
            ],
            "type": "u64"
          },
          {
            "name": "totalTipLamports",
            "docs": [
              "Total tips received in lamports"
            ],
            "type": "u64"
          },
          {
            "name": "createdAt",
            "docs": [
              "Timestamp when post was created"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "postCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "post",
            "type": "pubkey"
          },
          {
            "name": "community",
            "type": "pubkey"
          },
          {
            "name": "postId",
            "type": "u64"
          },
          {
            "name": "author",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "isAnonymous",
            "type": "bool"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "postLiked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "post",
            "type": "pubkey"
          },
          {
            "name": "liker",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "postTipped",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "post",
            "type": "pubkey"
          },
          {
            "name": "tipper",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "postUnliked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "post",
            "type": "pubkey"
          },
          {
            "name": "unliker",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "profileAccount",
      "docs": [
        "User profile account",
        "PDA: [\"profile\", user_wallet]",
        "",
        "Stores user identity information. Display name and avatar are on-chain",
        "for quick access and verification. Profile is wallet-owned and can only",
        "be updated by the wallet owner."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "docs": [
              "Owner wallet public key"
            ],
            "type": "pubkey"
          },
          {
            "name": "displayName",
            "docs": [
              "Display name shown in the app"
            ],
            "type": "string"
          },
          {
            "name": "avatarUri",
            "docs": [
              "URI to avatar image (IPFS/Arweave)"
            ],
            "type": "string"
          },
          {
            "name": "followerCount",
            "docs": [
              "Number of followers (updated on follow/unfollow)"
            ],
            "type": "u64"
          },
          {
            "name": "followingCount",
            "docs": [
              "Number of users this profile is following"
            ],
            "type": "u64"
          },
          {
            "name": "createdAt",
            "docs": [
              "Timestamp when profile was created"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "profileCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "profile",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "displayName",
            "type": "string"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "profileUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "profile",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "userFollowed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "follower",
            "type": "pubkey"
          },
          {
            "name": "followed",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "userUnfollowed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "follower",
            "type": "pubkey"
          },
          {
            "name": "unfollowed",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "voteAccount",
      "docs": [
        "Vote record",
        "PDA: [\"vote\", poll_pubkey, voter_wallet]",
        "",
        "Records that a user voted in a poll and which option they chose.",
        "Enforces one-vote-per-user-per-poll."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "poll",
            "docs": [
              "Poll this vote belongs to"
            ],
            "type": "pubkey"
          },
          {
            "name": "voter",
            "docs": [
              "User who voted"
            ],
            "type": "pubkey"
          },
          {
            "name": "optionIndex",
            "docs": [
              "Index of the option voted for"
            ],
            "type": "u8"
          },
          {
            "name": "votedAt",
            "docs": [
              "Timestamp when vote was cast"
            ],
            "type": "i64"
          }
        ]
      }
    }
  ]
};
